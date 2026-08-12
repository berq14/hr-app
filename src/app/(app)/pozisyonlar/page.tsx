import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, btnSecondary } from "@/components/ui";
import { FilterBar } from "@/components/filter-bar";
import { formatNumber, formatPercent } from "@/lib/domain";

export const metadata = { title: "Pozisyonlar" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function PozisyonlarPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireUser();
  const sp = await searchParams;

  const rows = await db.projectPosition.findMany({
    include: { project: true, position: true },
    orderBy: [{ project: { bolge: "asc" } }, { normKadro: "desc" }],
  });

  const [bolgeler, kurumlar, segmentler] = await Promise.all([
    db.project.findMany({ select: { bolge: true }, distinct: ["bolge"] }),
    db.project.findMany({ select: { kurum: true }, distinct: ["kurum"] }),
    db.project.findMany({ select: { segment: true }, distinct: ["segment"] }),
  ]);

  let list = rows.map((r) => ({
    id: r.id,
    ulke: r.project.ulke,
    bolge: r.project.bolge,
    kurum: r.project.kurum,
    segment: r.project.segment,
    pozisyon: r.position.ad,
    norm: r.normKadro,
    aktif: r.aktifKadro,
    eksik: r.normKadro - r.aktifKadro,
    eksikOrani: r.normKadro ? ((r.normKadro - r.aktifKadro) / r.normKadro) * 100 : 0,
  }));

  const q = s(sp.q)?.toLocaleLowerCase("tr-TR");
  if (q) list = list.filter((r) => `${r.pozisyon} ${r.kurum} ${r.segment}`.toLocaleLowerCase("tr-TR").includes(q));
  if (s(sp.bolge)) list = list.filter((r) => r.bolge === s(sp.bolge));
  if (s(sp.kurum)) list = list.filter((r) => r.kurum === s(sp.kurum));
  if (s(sp.segment)) list = list.filter((r) => r.segment === s(sp.segment));

  return (
    <div className="space-y-5">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <FilterBar
            arama={{ placeholder: "Pozisyon adı, kurum veya segment ara..." }}
            filtreler={[
              { tip: "select", ad: "bolge", etiket: "Bölge", secenekler: bolgeler.map((x) => ({ value: x.bolge, label: x.bolge })) },
              { tip: "select", ad: "kurum", etiket: "Kurum", secenekler: kurumlar.map((x) => ({ value: x.kurum, label: x.kurum })) },
              { tip: "select", ad: "segment", etiket: "Segment", secenekler: segmentler.map((x) => ({ value: x.segment, label: x.segment })) },
            ]}
          />
          <a href="/api/projeler/disa-aktar" className={btnSecondary + " shrink-0"}>
            <Download className="h-4 w-4" /> Dışa Aktar
          </a>
        </div>
      </Card>

      <Card>
        <p className="border-b border-line px-4 py-3 text-[13px] text-muted">
          Toplam <span className="font-semibold text-primary">{list.length} pozisyon</span>
        </p>
        <div className="table-scroll">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {["Ülke", "Bölge", "Kurum", "Segment", "Pozisyon Adı", "Toplam Norm Kadro", "Aktif Kadro", "Eksik Sayısı", "Eksik Oranı"].map((h) => (
                  <th key={h} className="px-3.5 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-line/60 hover:bg-slate-50/60">
                  <td className="px-3.5 py-2.5">{r.ulke}</td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">{r.bolge}</td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">{r.kurum}</td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">{r.segment}</td>
                  <td className="px-3.5 py-2.5 font-medium whitespace-nowrap">{r.pozisyon}</td>
                  <td className="px-3.5 py-2.5 text-right">{formatNumber(r.norm)}</td>
                  <td className="px-3.5 py-2.5 text-right">{formatNumber(r.aktif)}</td>
                  <td className="px-3.5 py-2.5 text-right">{formatNumber(r.eksik)}</td>
                  <td className="px-3.5 py-2.5 text-right font-medium text-red-500">
                    {formatPercent(r.eksikOrani)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
