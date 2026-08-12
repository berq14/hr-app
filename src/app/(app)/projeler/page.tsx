import Link from "next/link";
import { Plus, FileSpreadsheet } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { normKadroOzet } from "@/lib/analytics";
import { db } from "@/lib/db";
import { Card, PageTitle, btnPrimary, btnSecondary } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { formatNumber, formatPercent } from "@/lib/domain";

export const metadata = { title: "Projeler" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function ProjelerPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireUser();
  const sp = await searchParams;
  const ozet = await normKadroOzet();

  const [bolgeler, kurumlar, segmentler, iller] = await Promise.all([
    db.project.findMany({ select: { bolge: true }, distinct: ["bolge"] }),
    db.project.findMany({ select: { kurum: true }, distinct: ["kurum"] }),
    db.project.findMany({ select: { segment: true }, distinct: ["segment"] }),
    db.project.findMany({ select: { il: true }, distinct: ["il"] }),
  ]);

  let rows = ozet.rows;
  const q = s(sp.q)?.toLocaleLowerCase("tr-TR");
  if (q) rows = rows.filter((r) => `${r.ad} ${r.kod} ${r.ikSorumlusu}`.toLocaleLowerCase("tr-TR").includes(q));
  if (s(sp.bolge)) rows = rows.filter((r) => r.bolge === s(sp.bolge));
  if (s(sp.kurum)) rows = rows.filter((r) => r.kurum === s(sp.kurum));
  if (s(sp.segment)) rows = rows.filter((r) => r.segment === s(sp.segment));
  if (s(sp.il)) rows = rows.filter((r) => r.il === s(sp.il));

  const yonlendirilen = await db.candidate.groupBy({
    by: ["projectId"],
    where: { projeYonlendirildi: true, durum: "OLUMLU" },
    _count: { _all: true },
  });
  const yonMap = new Map(yonlendirilen.map((r) => [r.projectId, r._count._all]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageTitle title="Projeler" subtitle="Tüm projelerin listesi ve kadro durumları" />
        <div className="flex flex-wrap gap-2.5">
          <a href="/api/projeler/disa-aktar" className={btnSecondary}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel İndir
          </a>
          <Link href="/projeler/yeni" className={btnPrimary}>
            <Plus className="h-4 w-4" /> Yeni Proje Ekle
          </Link>
        </div>
      </div>

      <Card className="p-4">
        <FilterBar
          arama={{ placeholder: "Proje adı, kodu veya sorumlu ara..." }}
          filtreler={[
            { tip: "select", ad: "bolge", etiket: "Bölge", secenekler: bolgeler.map((x) => ({ value: x.bolge, label: x.bolge })) },
            { tip: "select", ad: "kurum", etiket: "Kurum", secenekler: kurumlar.map((x) => ({ value: x.kurum, label: x.kurum })) },
            { tip: "select", ad: "segment", etiket: "Segment", secenekler: segmentler.map((x) => ({ value: x.segment, label: x.segment })) },
            { tip: "select", ad: "il", etiket: "Proje İli", secenekler: iller.map((x) => ({ value: x.il, label: x.il })) },
          ]}
        />
      </Card>

      <Card>
        <div className="table-scroll">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] text-muted">
                {[
                  "Ülke", "Bölge", "Kurum", "Segment", "Proje Adı", "Proje Kodu",
                  "Proje İli", "Proje İlçesi", "Masraf Merkezi", "İK Sorumlusu",
                  "Norm Kadro (MY)", "Aktif Kadro (MY)", "MY Eksik", "MY Eksik Oranı",
                  "Norm Kadro (BY)", "Aktif Kadro (BY)", "BY Eksik", "BY Eksik Oranı",
                  "Yönlendirilen Olumlu Personel",
                ].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.ulke}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.bolge}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.kurum}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.segment}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.ad}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{r.kod}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.il}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.ilce}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.masrafMerkezi}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.ikSorumlusu}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.myNorm)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.myAktif)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.myEksik)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-red-500">{formatPercent(r.myEksikOrani)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.byNorm)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.byAktif)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.byEksik)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-red-500">{formatPercent(r.byEksikOrani)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-primary">
                    {formatNumber(yonMap.get(r.id) ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-[13px] text-muted">
          Toplam <span className="font-semibold text-foreground">{rows.length}</span> kayıt
        </p>
      </Card>
    </div>
  );
}
