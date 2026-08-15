import Link from "next/link";
import {
  Bot,
  CalendarClock,
  ListChecks,
  PhoneCall,
  PhoneMissed,
  Info,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/ivr/engine";
import { Card, PageTitle, Badge, durumBadgeColor } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/domain";
import {
  KampanyaAyarlariForm,
  SimdiCalistirButonu,
  SoruSatiri,
  YeniSoruForm,
} from "./forms";

export const metadata = { title: "Telesekreter" };
export const dynamic = "force-dynamic";

export default async function TelesekreterPage() {
  await requireUser();
  const [settings, sorular, bekleyen, tamamlananBugun, ulasilamayanToplam, sonGorevler] =
    await Promise.all([
      getSettings(),
      db.ivrQuestion.findMany({ orderBy: { sira: "asc" } }),
      db.ivrCallTask.count({ where: { durum: "bekliyor" } }),
      db.ivrCallTask.count({
        where: {
          durum: "tamamlandi",
          updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      db.ivrCallTask.count({ where: { durum: "ulasilamadi" } }),
      db.ivrCallTask.findMany({
        where: { durum: { not: "bekliyor" } },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: { candidate: { select: { id: true, adSoyad: true } } },
      }),
    ]);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Telesekreter (Otomatik Ön Görüşme)"
        subtitle="Beklemedeki adayları günde iki kez otomatik arayıp tanımlı soruları soran ve sonucu sisteme işleyen IVR kurgusunu yönetin."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: CalendarClock, label: "Kampanya Durumu", value: settings.aktif ? "Aktif" : "Pasif", extra: `${settings.saat1} ve ${settings.saat2}` },
          { icon: PhoneCall, label: "Arama Kuyruğu", value: formatNumber(bekleyen), extra: "bekleyen görev" },
          { icon: ListChecks, label: "Bugün Tamamlanan", value: formatNumber(tamamlananBugun), extra: "ön görüşme" },
          { icon: PhoneMissed, label: "Ulaşılamayan (kapalı)", value: formatNumber(ulasilamayanToplam), extra: "deneme hakkı bitti" },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <span className="flex items-center gap-2 text-xs text-muted">
              <k.icon className="h-4 w-4" /> {k.label}
            </span>
            <p className="mt-1.5 text-xl font-bold">{k.value}</p>
            <p className="text-xs text-muted">{k.extra}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Kampanya Ayarları</h2>
          <p className="mt-0.5 mb-4 text-[13px] text-muted">
            Sistem her gün bu iki saatte, durumu <Badge color="orange">Beklemede</Badge>{" "}
            olan ve telefonu bulunan adayları otomatik arar.
            {settings.sonCalistirma
              ? ` Son çalıştırma: ${formatDateTime(settings.sonCalistirma)}.`
              : " Henüz hiç çalışmadı."}
          </p>
          <KampanyaAyarlariForm
            defaults={{
              aktif: settings.aktif,
              saat1: settings.saat1,
              saat2: settings.saat2,
              maxDeneme: settings.maxDeneme,
              olumluEsigi: settings.olumluEsigi,
            }}
          />
          <div className="mt-5 border-t border-line pt-4">
            <SimdiCalistirButonu />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-semibold">Ön Görüşme Soruları</h2>
          <p className="mt-0.5 mb-4 text-[13px] text-muted">
            Sorular telefonda sırasıyla TTS ile okunur; aday tuşlayarak cevaplar
            (DTMF). Hoparlör simgesiyle sesli önizleme yapabilirsiniz.
          </p>
          {sorular.length === 0 ? (
            <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-700">
              Henüz soru tanımlanmadı. Kampanyanın çalışması için en az bir aktif
              soru gerekli.
            </p>
          ) : (
            <ul className="mb-5 space-y-2">
              {sorular.map((q, i) => (
                <SoruSatiri key={q.id} q={q} ilk={i === 0} son={i === sorular.length - 1} />
              ))}
            </ul>
          )}
          <YeniSoruForm />
        </Card>
      </div>

      <Card>
        <h2 className="border-b border-line px-5 py-4 text-[15px] font-semibold">
          Son Aramalar{" "}
          <span className="font-normal text-muted">
            (detaylı raporlar{" "}
            <Link href="/call-center" className="text-primary hover:underline">
              Yapay Zeka Call Center
            </Link>{" "}
            ekranında)
          </span>
        </h2>
        <div className="table-scroll">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {["Aday", "Son Deneme", "Deneme Sayısı", "Durum", "Sonuç"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sonGorevler.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    Henüz arama yapılmadı. Kampanyayı aktifleştirin veya simülasyon
                    turunu çalıştırın.
                  </td>
                </tr>
              ) : (
                sonGorevler.map((t) => (
                  <tr key={t.id} className="border-b border-line/60">
                    <td className="px-4 py-2.5">
                      <Link href={`/adaylar/${t.candidate.id}`} className="font-medium text-primary hover:underline">
                        {t.candidate.adSoyad}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(t.sonDeneme)}</td>
                    <td className="px-4 py-2.5">{t.denemeSayisi}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={t.durum === "tamamlandi" ? "green" : t.durum === "ulasilamadi" ? "gray" : "orange"}>
                        {t.durum === "tamamlandi" ? "Tamamlandı" : t.durum === "ulasilamadi" ? "Ulaşılamadı" : "Bekliyor"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {t.sonuc ? <Badge color={durumBadgeColor(t.sonuc)}>{t.sonuc}</Badge> : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Bot className="h-5 w-5 text-primary" /> Gerçek Santral Entegrasyonu
        </h2>
        <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            Şu an aramalar <strong>simülatörle</strong> yürütülüyor — akışın tamamını
            gerçek telefon olmadan test edebilirsiniz. Telefoni sağlayıcısı
            (ör. Netgsm, Verimor bulut santral veya kendi Asterisk santraliniz)
            edinildiğinde, sağlayıcı arama sonuçlarını{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px]">
              POST /api/ivr/webhook
            </code>{" "}
            ucuna API anahtarıyla gönderir; skorlama ve raporlama aynen çalışmaya
            devam eder. Sağlayıcı seçimi netleştiğinde adaptör eklenecektir.
          </span>
        </p>
      </Card>
    </div>
  );
}
