import {
  FolderKanban,
  Users,
  UserCheck,
  UserMinus,
  Gauge,
  UsersRound,
  UserRoundCheck,
  UserRoundMinus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { normKadroOzet } from "@/lib/analytics";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui";
import { DonutRow, GroupedBars } from "@/components/charts";
import { formatNumber, formatPercent } from "@/lib/domain";

export const metadata = { title: "Norm Kadro ve Eksikler" };
export const dynamic = "force-dynamic";

export default async function NormKadroPage() {
  await requireUser();
  const ozet = await normKadroOzet();

  const grupla = (key: "bolge" | "kurum" | "segment") => {
    const map = new Map<string, { norm: number; eksik: number }>();
    for (const r of ozet.rows) {
      const k = r[key];
      const e = map.get(k) ?? { norm: 0, eksik: 0 };
      e.norm += r.myNorm;
      e.eksik += r.myEksik;
      map.set(k, e);
    }
    return [...map.entries()]
      .map(([name, v]) => ({
        name,
        value: v.norm ? Math.round((v.eksik / v.norm) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  const projeGrafik = [...ozet.rows]
    .sort((a, b) => b.myNorm - a.myNorm)
    .slice(0, 10)
    .map((r) => ({
      name: r.ad.length > 18 ? r.ad.slice(0, 17) + "…" : r.ad,
      "Aktif Kadro": r.myAktif,
      "Eksik Kadro (MY)": r.myEksik,
      "Eksik Kadro (BY)": r.byEksik,
    }));

  const myEksikOrani = ozet.myNorm ? (ozet.myEksik / ozet.myNorm) * 100 : 0;
  const byEksikOrani = ozet.byNorm ? (ozet.byEksik / ozet.byNorm) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-8">
        <StatCard icon={FolderKanban} tone="blue" title="Toplam Proje" value={ozet.toplamProje} suffix="Aktif Proje" />
        <StatCard icon={Users} tone="green" title="Toplam Norm Kadro (MY)" value={ozet.myNorm} suffix="Kişi" />
        <StatCard icon={UserCheck} tone="cyan" title="Aktif Kadro (MY)" value={ozet.myAktif} suffix="Kişi" />
        <StatCard icon={UserMinus} tone="red" title="MY Eksik" value={ozet.myEksik} suffix="Kişi" />
        <StatCard icon={Gauge} tone="indigo" title="MY Eksik Oranı" value={formatPercent(myEksikOrani)} />
        <StatCard icon={UsersRound} tone="orange" title="Toplam Norm Kadro (BY)" value={ozet.byNorm} suffix="Kişi" />
        <StatCard icon={UserRoundCheck} tone="green" title="Aktif Kadro (BY)" value={ozet.byAktif} suffix="Kişi" />
        <StatCard icon={UserRoundMinus} tone="red" title="BY Eksik" value={`${formatNumber(ozet.byEksik)}`} suffix={formatPercent(byEksikOrani)} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <Card className="p-4 sm:p-5 xl:col-span-2">
          <h3 className="mb-3 text-[15px] font-semibold">
            Projelerin Norm Kadro Durumu <span className="font-normal text-muted">(İlk 10)</span>
          </h3>
          <GroupedBars
            data={projeGrafik}
            series={[
              { key: "Aktif Kadro", color: "#10b981" },
              { key: "Eksik Kadro (MY)", color: "#ef4444" },
              { key: "Eksik Kadro (BY)", color: "#f59e0b" },
            ]}
            height={280}
            stacked
          />
        </Card>
        {(
          [
            ["Bölgelere Göre Eksik Kadro Oranı (MY)", grupla("bolge")],
            ["Kurumlara Göre Eksik Kadro Oranı (MY)", grupla("kurum")],
          ] as const
        ).map(([title, data]) => (
          <Card key={title} className="p-4 sm:p-5">
            <h3 className="mb-3 text-[15px] font-semibold">{title}</h3>
            <DonutRow data={data} height={140} showCount={false} />
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="border-b border-line px-4 py-4 text-[15px] font-semibold">
          Proje Bazlı Norm Kadro ve Eksik Durumu
        </h3>
        <div className="table-scroll">
          <table className="w-full text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] text-muted">
                {[
                  "Ülke", "Bölge", "Kurum", "Segment", "Proje Adı", "Proje Kodu",
                  "Proje İli", "Proje İlçesi", "Masraf Merkezi",
                  "Norm Kadro (MY)", "Aktif Kadro (MY)", "MY Eksik", "MY Eksik Oranı",
                  "Norm Kadro (BY)", "Aktif Kadro (BY)", "BY Eksik", "BY Eksik Oranı",
                ].map((h) => (
                  <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ozet.rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5">{r.ulke}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.bolge}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.kurum}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{r.segment}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.ad}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{r.kod}</td>
                  <td className="px-3 py-2.5">{r.il}</td>
                  <td className="px-3 py-2.5">{r.ilce}</td>
                  <td className="px-3 py-2.5">{r.masrafMerkezi}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.myNorm)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.myAktif)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.myEksik)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-red-500">{formatPercent(r.myEksikOrani)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.byNorm)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.byAktif)}</td>
                  <td className="px-3 py-2.5 text-right">{formatNumber(r.byEksik)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-red-500">{formatPercent(r.byEksikOrani)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
