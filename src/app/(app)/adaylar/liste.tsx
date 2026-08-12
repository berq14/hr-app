import Link from "next/link";
import { Download, Settings2 } from "lucide-react";
import type { CandidateStatus } from "@prisma/client";
import { listCandidates, filterOptions } from "@/lib/queries";
import { decryptCandidate } from "@/lib/candidates";
import { Card, Badge, Avatar, durumBadgeColor, btnSecondary } from "@/components/ui";
import { FilterBar, type FilterDef } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import {
  formatDate,
  formatNumber,
  formatPhone,
  ON_MULAKAT_SONUCLARI,
} from "@/lib/domain";

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

function onMulakatBadge(v: string | null) {
  if (!v) return <Badge color="gray">—</Badge>;
  const color =
    v === "Olumlu" ? "green" : v === "Olumsuz" ? "red" : v === "Beklemede" ? "orange" : "gray";
  return <Badge color={color}>{v}</Badge>;
}

/** Tüm/Olumlu/Olumsuz aday listelerinin ortak gövdesi. */
export async function AdayListesi({
  base,
  searchParams,
  fixedDurum,
  ilceFiltre = false,
  onMulakatFiltre = false,
}: {
  base: string;
  searchParams: SP;
  fixedDurum?: CandidateStatus;
  ilceFiltre?: boolean;
  onMulakatFiltre?: boolean;
}) {
  const sp = searchParams;
  const opts = await filterOptions();
  const liste = await listCandidates({
    durum: fixedDurum ?? ((s(sp.durum) as CandidateStatus) || "TUMU"),
    q: s(sp.q),
    pozisyon: s(sp.pozisyon),
    kaynak: s(sp.kaynak),
    il: s(sp.il),
    ilce: s(sp.ilce),
    onMulakat: s(sp.mulakat),
    from: s(sp.from),
    to: s(sp.to),
    sayfa: Number(s(sp.sayfa) ?? 1),
    adet: Number(s(sp.adet) ?? 10),
  });
  const rows = liste.rows.map((r) => decryptCandidate(r));

  const filtreler: FilterDef[] = [
    { tip: "select", ad: "pozisyon", etiket: "Pozisyon", secenekler: opts.positions.map((x) => ({ value: x.id, label: x.ad })) },
    { tip: "select", ad: "kaynak", etiket: "Başvuru Kaynağı", secenekler: opts.sources.map((x) => ({ value: x.id, label: x.ad })) },
  ];
  if (onMulakatFiltre) {
    filtreler.push({ tip: "select", ad: "mulakat", etiket: "Ön Mülakat Sonucu", secenekler: ON_MULAKAT_SONUCLARI.map((x) => ({ value: x, label: x })) });
  }
  filtreler.push({ tip: "tarih-araligi", adFrom: "from", adTo: "to", etiket: "Tarih Aralığı" });
  if (ilceFiltre) {
    filtreler.push({ tip: "select", ad: "il", etiket: "İl", secenekler: opts.iller.map((x) => ({ value: x, label: x })) });
  }

  const exportQs = new URLSearchParams();
  for (const k of ["q", "pozisyon", "kaynak", "il", "ilce", "mulakat", "from", "to"]) {
    const v = s(sp[k]);
    if (v) exportQs.set(k, v);
  }
  if (fixedDurum) exportQs.set("durum", fixedDurum);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <FilterBar
            arama={{ placeholder: "Aday adı, telefon veya pozisyon ara..." }}
            filtreler={filtreler}
          />
          <a
            href={`/api/adaylar/disa-aktar?${exportQs.toString()}`}
            className={btnSecondary + " shrink-0"}
          >
            <Download className="h-4 w-4" /> Dışa Aktar
          </a>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="text-[13px] text-muted">
            Toplam{" "}
            <span className="font-semibold text-primary">
              {formatNumber(liste.toplam)} aday
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
              <Settings2 className="h-4 w-4" /> Sütunları Özelleştir
            </button>
            <Pagination
              base={base}
              params={sp as Record<string, string>}
              sayfa={liste.sayfa}
              sayfaSayisi={liste.sayfaSayisi}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {[
                  "Ad Soyad", "Doğum Tarihi", "Cinsiyet", "Tel No", "İl", "İlçe",
                  "Başvurulan Pozisyon", "Başvuru Kaynağı", "Öğrenim Durumu",
                  "Engellilik Durumu", "Emeklilik Durumu", "Askerlik Durumu",
                  "Ön Mülakat Sonucu",
                ].map((h) => (
                  <th key={h} className="px-3.5 py-3 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-muted">
                    Filtrelere uyan aday bulunamadı.
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 hover:bg-slate-50/60">
                    <td className="px-3.5 py-2.5">
                      <Link href={`/adaylar/${c.id}`} className="flex items-center gap-2.5 font-medium whitespace-nowrap">
                        <Avatar name={c.adSoyad} />
                        {c.adSoyad}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">{c.dogumTarihi ?? "—"}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{c.cinsiyet ?? "—"}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">{formatPhone(c.telefon)}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{c.il ?? "—"}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{c.ilce ?? "—"}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">{c.position?.ad ?? "—"}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">{c.source?.ad ?? "—"}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{c.ogrenimDurumu ?? "—"}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{c.engellilikDurumu ? "Evet" : "Hayır"}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{c.emeklilikDurumu ? "Evet" : "Hayır"}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{c.askerlikDurumu ?? "—"}</td>
                    <td className="px-3.5 py-2.5">{onMulakatBadge(c.onMulakatSonucu)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <SayfaBoyutu />
          <Pagination
            base={base}
            params={sp as Record<string, string>}
            sayfa={liste.sayfa}
            sayfaSayisi={liste.sayfaSayisi}
          />
        </div>
      </Card>
    </div>
  );
}

function SayfaBoyutu() {
  return (
    <p className="text-[13px] text-muted">
      Sayfada <span className="font-medium text-foreground">10</span> kayıt gösteriliyor
    </p>
  );
}

export function tarihBilgisi(d: Date | null) {
  return d ? formatDate(d) : "—";
}
