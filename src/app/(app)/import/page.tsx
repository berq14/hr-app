import { Download, Bot } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageTitle, Badge, btnSecondary, durumBadgeColor } from "@/components/ui";
import { formatDateTime, formatNumber } from "@/lib/domain";
import { UploadForm } from "./upload-form";

export const metadata = { title: "Toplu Aday Aktar" };
export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await requireUser();
  const batches = await db.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle
          title="Toplu Aday Aktar"
          subtitle="Excel, CSV veya JSON dosyalarındaki başvuruları ve telesekreter robotu verilerini sisteme aktarın."
        />
        <a href="/api/import/sablon" className={btnSecondary}>
          <Download className="h-4 w-4" /> Örnek Şablon İndir
        </a>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_380px]">
        <Card className="p-5 sm:p-6">
          <UploadForm />
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <Bot className="h-5 w-5 text-primary" /> Telesekreter Robotu (API)
          </h3>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Telesekreter robotu, aldığı başvuruları ve arama sonuçlarını API
            üzerinden otomatik gönderebilir. İstekler{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11.5px]">
              POST /api/ingest
            </code>{" "}
            adresine, Ayarlar bölümünden oluşturulan API anahtarı ile yapılır.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-3.5 text-[11px] leading-relaxed text-slate-100">
{`POST /api/ingest
Authorization: Bearer <api-anahtarı>

{
  "kayitlar": [{
    "adSoyad": "Mehmet Aydın",
    "telefon": "0532 123 45 67",
    "pozisyon": "Kaynakçı",
    "kaynak": "işkur.gov.tr",
    "arama": {
      "tarih": "2026-08-12T10:24:00+03:00",
      "kacinciArama": 1,
      "sonuc": "Olumlu",
      "gorusmeSuresiSn": 154,
      "smsDurumu": "Gönderildi",
      "not": "İşe başlamak istiyor."
    }
  }]
}`}
          </pre>
        </Card>
      </div>

      <Card>
        <h3 className="border-b border-line px-4 py-4 text-[15px] font-semibold">
          Aktarım Geçmişi
        </h3>
        <div className="table-scroll">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {["Dosya", "Tür", "Tarih", "Toplam Satır", "Başarılı", "Hatalı", "Durum"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    Henüz aktarım yapılmadı.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="border-b border-line/60">
                    <td className="px-4 py-2.5 font-medium">{b.dosyaAdi}</td>
                    <td className="px-4 py-2.5 uppercase text-slate-600">{b.tip}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(b.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right">{formatNumber(b.toplamKayit)}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{formatNumber(b.basarili)}</td>
                    <td className="px-4 py-2.5 text-right text-red-500">{formatNumber(b.hatali)}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={b.durum === "tamamlandi" ? "green" : durumBadgeColor(b.durum)}>
                        {b.durum === "tamamlandi" ? "Tamamlandı" : b.durum}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
