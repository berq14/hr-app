import "server-only";
import type { IvrCallTask, IvrQuestion, IvrSettings } from "@prisma/client";
import { db } from "../db";
import { encryptField } from "../crypto";
import { audit } from "../audit";

/**
 * Telesekreter (IVR) motoru — sağlayıcıdan bağımsız çekirdek.
 *
 * Akış: zamanlayıcı günde 2 kez tetikler → BEKLEMEDE adaylardan arama
 * kuyruğu oluşur → sağlayıcı adaptörü aramayı yapar (şimdilik simülatör)
 * → cevaplar skorlanır → CallRecord yazılır ve aday durumu güncellenir.
 *
 * Gerçek sağlayıcı (Netgsm/Verimor/Asterisk...) bağlanacağı zaman yalnızca
 * dispatchCall() içindeki simülatör çağrısı, sağlayıcının "aramayı başlat"
 * API çağrısıyla değiştirilir; cevaplar /api/ivr/webhook ucuna düşer ve
 * aynı processCallResult() ile işlenir.
 */

export type CevapKaydi = {
  soruId: string;
  metin: string;
  tus: string;
  dogruMu: boolean;
};

export async function getSettings(): Promise<IvrSettings> {
  return db.ivrSettings.upsert({
    where: { id: "main" },
    create: { id: "main" },
    update: {},
  });
}

export async function getActiveQuestions(): Promise<IvrQuestion[]> {
  return db.ivrQuestion.findMany({
    where: { aktif: true },
    orderBy: { sira: "asc" },
  });
}

/** Cevapları karar kuralına göre skorlar. */
export function scoreAnswers(
  cevaplar: CevapKaydi[],
  settings: Pick<IvrSettings, "olumluEsigi">,
  sorular: IvrQuestion[]
): "Olumlu" | "Olumsuz" {
  const eleyiciler = new Set(sorular.filter((s) => s.eleyici).map((s) => s.id));
  for (const c of cevaplar) {
    if (eleyiciler.has(c.soruId) && !c.dogruMu) return "Olumsuz";
  }
  const dogru = cevaplar.filter((c) => c.dogruMu).length;
  const oran = cevaplar.length ? (dogru / cevaplar.length) * 100 : 0;
  return oran >= settings.olumluEsigi ? "Olumlu" : "Olumsuz";
}

/**
 * Ulaşılan bir aramanın sonucunu işler: görev + CallRecord + aday durumu.
 * Hem simülatör hem gerçek sağlayıcı webhook'u bu fonksiyonu kullanır.
 */
export async function processCallResult(params: {
  task: IvrCallTask;
  cevaplar: CevapKaydi[];
  gorusmeSuresiSn: number;
  settings: IvrSettings;
  sorular: IvrQuestion[];
}) {
  const { task, cevaplar, gorusmeSuresiSn, settings, sorular } = params;
  const sonuc = scoreAnswers(cevaplar, settings, sorular);
  const deneme = task.denemeSayisi;

  const ozet = cevaplar
    .map((c, i) => `S${i + 1}: ${c.tus === "1" ? "Evet(1)" : c.tus === "2" ? "Hayır(2)" : c.tus}`)
    .join(", ");

  await db.$transaction([
    db.ivrCallTask.update({
      where: { id: task.id },
      data: {
        durum: "tamamlandi",
        cevaplar: JSON.stringify(cevaplar),
        sonuc,
        sonDeneme: new Date(),
      },
    }),
    db.callRecord.create({
      data: {
        candidateId: task.candidateId,
        aramaTarihi: new Date(),
        kacinciArama: deneme,
        gorusmeSuresiSn,
        sonuc,
        smsDurumu: null,
        notlar: encryptField(`Telesekreter ön görüşme — ${ozet}`),
      },
    }),
    db.candidate.update({
      where: { id: task.candidateId },
      data: {
        durum: sonuc === "Olumlu" ? "OLUMLU" : "OLUMSUZ",
        onMulakatSonucu: sonuc,
        onMulakatTarihi: new Date(),
      },
    }),
  ]);
  return sonuc;
}

/** Ulaşılamayan denemeyi işler; deneme hakkı bitince adayı ULASILAMADI yapar. */
export async function processUnreachable(task: IvrCallTask, settings: IvrSettings) {
  if (task.denemeSayisi >= settings.maxDeneme) {
    await db.$transaction([
      db.ivrCallTask.update({
        where: { id: task.id },
        data: { durum: "ulasilamadi", sonuc: "Ulaşılamadı", sonDeneme: new Date() },
      }),
      db.callRecord.create({
        data: {
          candidateId: task.candidateId,
          aramaTarihi: new Date(),
          kacinciArama: task.denemeSayisi,
          sonuc: "Ulaşılamadı",
          notlar: encryptField(
            `Telesekreter: ${settings.maxDeneme} denemede ulaşılamadı.`
          ),
        },
      }),
      db.candidate.update({
        where: { id: task.candidateId },
        data: { durum: "ULASILAMADI", onMulakatSonucu: "Ulaşılamadı" },
      }),
    ]);
    return "kapatildi" as const;
  }
  await db.$transaction([
    db.ivrCallTask.update({
      where: { id: task.id },
      data: { sonDeneme: new Date() },
    }),
    db.callRecord.create({
      data: {
        candidateId: task.candidateId,
        aramaTarihi: new Date(),
        kacinciArama: task.denemeSayisi,
        sonuc: "Ulaşılamadı",
        notlar: encryptField("Telesekreter: cevap yok, sonraki turda tekrar denenecek."),
      },
    }),
  ]);
  return "tekrar-denenecek" as const;
}

/**
 * Simülatör sağlayıcısı: gerçek arama yapmadan olası sonuçları üretir.
 * Gerçek sağlayıcı entegrasyonunda bu fonksiyonun yerini API çağrısı alır.
 */
async function simulateCall(
  task: IvrCallTask,
  sorular: IvrQuestion[],
  settings: IvrSettings
) {
  const ulasildi = Math.random() < 0.65;
  if (!ulasildi) return processUnreachable(task, settings);

  const cevaplar: CevapKaydi[] = [];
  for (const s of sorular) {
    const olumluBasti = Math.random() < 0.7;
    const tus = olumluBasti ? s.olumluTus : s.olumluTus === "1" ? "2" : "1";
    cevaplar.push({ soruId: s.id, metin: s.metin, tus, dogruMu: olumluBasti });
    if (s.eleyici && !olumluBasti) break; // eleyici soruda görüşme biter
  }
  const sure = 15 + cevaplar.length * (8 + Math.floor(Math.random() * 10));
  return processCallResult({ task, cevaplar, gorusmeSuresiSn: sure, settings, sorular });
}

/**
 * Kampanya turu: kuyruk oluştur + bekleyen görevleri arat.
 * trigger: "otomatik-1" | "otomatik-2" | "manuel"
 */
export async function runCampaignTick(trigger: string, userId?: string) {
  const settings = await getSettings();
  if (!settings.aktif && trigger !== "manuel") {
    return { ok: false as const, error: "Kampanya pasif." };
  }
  const sorular = await getActiveQuestions();
  if (sorular.length === 0) {
    return { ok: false as const, error: "Aktif soru tanımlı değil. Önce soru ekleyin." };
  }

  // 1) BEKLEMEDE + telefonu olan + açık görevi olmayan adaylar için görev aç
  const adaylar = await db.candidate.findMany({
    where: {
      durum: "BEKLEMEDE",
      telefon: { not: null },
      ivrTasks: { none: { durum: "bekliyor" } },
    },
    select: { id: true },
    take: 500,
  });
  if (adaylar.length > 0) {
    await db.ivrCallTask.createMany({
      data: adaylar.map((a) => ({
        candidateId: a.id,
        kaynak: trigger === "manuel" ? "manuel" : "otomatik",
      })),
    });
  }

  // 2) bekleyen görevleri işle (deneme sayacını artırarak)
  const tasks = await db.ivrCallTask.findMany({
    where: { durum: "bekliyor" },
    take: 300,
  });
  let ulasilan = 0;
  let ulasilamayan = 0;
  let kapatilan = 0;
  for (const t of tasks) {
    const guncel = await db.ivrCallTask.update({
      where: { id: t.id },
      data: { denemeSayisi: { increment: 1 } },
    });
    const r = await simulateCall(guncel, sorular, settings);
    if (r === "kapatildi") kapatilan++;
    else if (r === "tekrar-denenecek") ulasilamayan++;
    else ulasilan++;
  }

  // sonSlot'u zamanlayıcı yönetir; burada yalnızca çalıştırma zamanı yazılır
  await db.ivrSettings.update({
    where: { id: "main" },
    data: { sonCalistirma: new Date() },
  });
  await audit({
    userId: userId ?? null,
    eylem: "ivr-kampanya",
    detay: { trigger, yeniGorev: adaylar.length, aranan: tasks.length, ulasilan, ulasilamayan, kapatilan },
  });
  return {
    ok: true as const,
    yeniGorev: adaylar.length,
    aranan: tasks.length,
    ulasilan,
    ulasilamayan,
    kapatilan,
  };
}

export function nowIstanbul(): { hhmm: string; dateKey: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    hhmm: `${parts.hour}:${parts.minute}`,
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}
