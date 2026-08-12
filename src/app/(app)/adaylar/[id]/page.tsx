import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getClientIp, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { decryptCandidate } from "@/lib/candidates";
import { decryptField } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { filterOptions } from "@/lib/queries";
import { Card, PageTitle, Badge, Avatar, durumBadgeColor } from "@/components/ui";
import {
  DURUM_ETIKETLERI,
  formatDateTime,
  formatPhone,
} from "@/lib/domain";
import { AdayForm } from "../aday-form";
import { updateCandidateAction } from "../actions";

export const metadata = { title: "Aday Detayı" };

export default async function AdayDetay({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const raw = await db.candidate.findUnique({
    where: { id },
    include: {
      position: true,
      project: true,
      source: true,
      calls: { orderBy: { aramaTarihi: "desc" } },
      uploadedBy: { select: { name: true } },
    },
  });
  if (!raw) notFound();

  // kişisel veri görüntüleme denetim kaydı (KVKK)
  const h = await headers();
  await audit({
    userId: user.id,
    eylem: "aday-goruntule",
    varlik: "Candidate",
    varlikId: id,
    ip: getClientIp(h),
  });

  const aday = decryptCandidate(raw);
  const opts = await filterOptions();
  const updateWithId = updateCandidateAction.bind(null, id);

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={aday.adSoyad} className="h-14 w-14 text-lg" />
          <div className="min-w-0 flex-1">
            <PageTitle title={aday.adSoyad} subtitle={`${aday.position?.ad ?? "Pozisyon belirtilmemiş"} • ${aday.project?.ad ?? "Proje yok"}`} />
          </div>
          <Badge color={durumBadgeColor(aday.durum)}>{DURUM_ETIKETLERI[aday.durum]}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3 lg:grid-cols-5">
          {[
            ["Telefon", formatPhone(aday.telefon)],
            ["E-posta", aday.email ?? "—"],
            ["Başvuru Tarihi", formatDateTime(aday.basvuruTarihi)],
            ["Kaynak", aday.source?.ad ?? "—"],
            ["Kaydı Yükleyen", raw.uploadedBy?.name ?? aday.girisYontemi],
          ].map(([k, v]) => (
            <div key={k as string}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-[15px] font-semibold">Aday Bilgilerini Düzenle</h2>
        <AdayForm
          action={updateWithId}
          defaults={{
            adSoyad: aday.adSoyad,
            dogumTarihi: aday.dogumTarihi,
            cinsiyet: aday.cinsiyet,
            telefon: aday.telefon,
            email: aday.email,
            il: aday.il,
            ilce: aday.ilce,
            positionId: aday.positionId,
            projectId: aday.projectId,
            sourceId: aday.sourceId,
            ogrenimDurumu: aday.ogrenimDurumu,
            askerlikDurumu: aday.askerlikDurumu,
            engellilikDurumu: aday.engellilikDurumu,
            emeklilikDurumu: aday.emeklilikDurumu,
            durum: aday.durum,
            onMulakatSonucu: aday.onMulakatSonucu,
            notlar: aday.notlar,
          }}
          positions={opts.positions}
          projects={opts.projects.map((p) => ({ id: p.id, ad: p.ad }))}
          sources={opts.sources}
          submitLabel="Değişiklikleri Kaydet"
        />
      </Card>

      <Card id="aramalar">
        <h2 className="border-b border-line px-5 py-4 text-[15px] font-semibold">
          Arama Geçmişi{" "}
          <span className="font-normal text-muted">({aday.calls.length} kayıt)</span>
        </h2>
        <div className="table-scroll">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {["Arama Tarihi", "Kaçıncı Arama", "Görüşme Süresi", "Sonuç", "SMS Durumu", "Not"].map((th) => (
                  <th key={th} className="px-4 py-3 font-medium whitespace-nowrap">{th}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aday.calls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    Bu aday için arama kaydı yok.
                  </td>
                </tr>
              ) : (
                aday.calls.map((c) => (
                  <tr key={c.id} className="border-b border-line/60">
                    <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(c.aramaTarihi)}</td>
                    <td className="px-4 py-2.5">{c.kacinciArama}. Arama</td>
                    <td className="px-4 py-2.5">
                      {c.gorusmeSuresiSn
                        ? `${String(Math.floor(c.gorusmeSuresiSn / 60)).padStart(2, "0")}:${String(c.gorusmeSuresiSn % 60).padStart(2, "0")}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge color={durumBadgeColor(c.sonuc)}>{c.sonuc}</Badge>
                    </td>
                    <td className="px-4 py-2.5">{c.smsDurumu ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{decryptField(c.notlar) ?? "—"}</td>
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
