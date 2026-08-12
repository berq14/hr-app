import "server-only";
import { db } from "./db";

export async function callCenterStats(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const prevFrom = new Date(Date.now() - 2 * days * 86400_000);

  const cnt = (extra: Record<string, unknown>, f = from, t?: Date) =>
    db.callRecord.count({
      where: { aramaTarihi: t ? { gte: f, lt: t } : { gte: f }, ...extra },
    });

  const ULASILAN = { sonuc: { in: ["Olumlu", "Olumsuz", "Beklemede"] } };
  const [toplam, toplamP, ulasilan, ulasilanP, olumlu, olumluP, olumsuz, olumsuzP, beklemede, beklemedeP, hatali, hataliP, sms, smsP] =
    await Promise.all([
      cnt({}), cnt({}, prevFrom, from),
      cnt(ULASILAN), cnt(ULASILAN, prevFrom, from),
      cnt({ sonuc: "Olumlu" }), cnt({ sonuc: "Olumlu" }, prevFrom, from),
      cnt({ sonuc: "Olumsuz" }), cnt({ sonuc: "Olumsuz" }, prevFrom, from),
      cnt({ sonuc: "Beklemede" }), cnt({ sonuc: "Beklemede" }, prevFrom, from),
      cnt({ sonuc: "Hatalı Numara" }), cnt({ sonuc: "Hatalı Numara" }, prevFrom, from),
      cnt({ smsDurumu: "Gönderildi" }), cnt({ smsDurumu: "Gönderildi" }, prevFrom, from),
    ]);

  const pct = (c: number, p: number) => (p === 0 ? (c > 0 ? 100 : null) : ((c - p) / p) * 100);
  return {
    toplam: { value: toplam, delta: pct(toplam, toplamP) },
    ulasilan: { value: ulasilan, delta: pct(ulasilan, ulasilanP) },
    olumlu: { value: olumlu, delta: pct(olumlu, olumluP) },
    olumsuz: { value: olumsuz, delta: pct(olumsuz, olumsuzP) },
    beklemede: { value: beklemede, delta: pct(beklemede, beklemedeP) },
    hatali: { value: hatali, delta: pct(hatali, hataliP) },
    sms: { value: sms, delta: pct(sms, smsP) },
  };
}

export async function aramaGunluk(days = 14) {
  const from = new Date(Date.now() - (days - 1) * 86400_000);
  from.setHours(0, 0, 0, 0);
  const rows = await db.callRecord.findMany({
    where: { aramaTarihi: { gte: from } },
    select: { aramaTarihi: true },
  });
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86400_000);
    out.push({
      name: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
      value: rows.filter((r) => r.aramaTarihi.toDateString() === d.toDateString()).length,
    });
  }
  return out;
}

export async function sonucDagilimi(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const rows = await db.callRecord.groupBy({
    by: ["sonuc"],
    where: { aramaTarihi: { gte: from } },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ name: r.sonuc, value: r._count._all }))
    .sort((a, b) => b.value - a.value);
}

export async function kacinciAramadaUlasildi(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const rows = await db.callRecord.findMany({
    where: {
      aramaTarihi: { gte: from },
      sonuc: { in: ["Olumlu", "Olumsuz", "Beklemede"] },
    },
    select: { kacinciArama: true },
  });
  const out = [1, 2, 3, 4, 5].map((n) => ({
    name: `${n}. Arama`,
    value: rows.filter((r) => r.kacinciArama === n).length,
  }));
  out.push({
    name: "6+ Arama",
    value: rows.filter((r) => r.kacinciArama >= 6).length,
  });
  return out;
}

export async function saatlereGoreYogunluk(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const rows = await db.callRecord.findMany({
    where: { aramaTarihi: { gte: from } },
    select: { aramaTarihi: true },
  });
  const out = [];
  for (let h = 8; h <= 18; h++) {
    out.push({
      name: `${String(h).padStart(2, "0")}:00`,
      value: rows.filter((r) => r.aramaTarihi.getHours() === h).length,
    });
  }
  return out;
}

export async function smsSonuclari(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const where = { aramaTarihi: { gte: from } };
  const [gonderildi, okundu, tiklandi, basvurdu] = await Promise.all([
    db.callRecord.count({ where: { ...where, smsDurumu: "Gönderildi" } }),
    db.callRecord.count({ where: { ...where, smsOkundu: true } }),
    db.callRecord.count({ where: { ...where, linkTiklandi: true } }),
    db.callRecord.count({ where: { ...where, basvuruYapti: true } }),
  ]);
  return [
    { name: "SMS Gönderildi", value: gonderildi },
    { name: "SMS Okundu", value: okundu },
    { name: "Linke Tıklandı", value: tiklandi },
    { name: "Başvuru Yapan", value: basvurdu },
  ];
}

export async function aramaGecmisi(params: {
  q?: string;
  sonuc?: string;
  kacinci?: number;
  sayfa?: number;
  adet?: number;
}) {
  const sayfa = Math.max(1, params.sayfa ?? 1);
  const adet = Math.min(50, Math.max(5, params.adet ?? 10));
  const where: Record<string, unknown> = {};
  if (params.sonuc) where.sonuc = params.sonuc;
  if (params.kacinci) where.kacinciArama = params.kacinci;
  if (params.q) {
    where.candidate = {
      adSoyadIndex: { contains: params.q.toLocaleLowerCase("tr-TR").trim() },
    };
  }
  const [toplam, rows] = await Promise.all([
    db.callRecord.count({ where }),
    db.callRecord.findMany({
      where,
      include: { candidate: { include: { position: true } } },
      orderBy: { aramaTarihi: "desc" },
      skip: (sayfa - 1) * adet,
      take: adet,
    }),
  ]);
  return { toplam, rows, sayfa, adet, sayfaSayisi: Math.max(1, Math.ceil(toplam / adet)) };
}
