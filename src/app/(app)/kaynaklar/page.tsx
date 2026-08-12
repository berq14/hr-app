import {
  FileText,
  UsersRound,
  Award,
  BarChart3,
  TrendingUp,
  Coins,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { donusumHunisi, kaynakPerformans } from "@/lib/analytics";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui";
import { Funnel, RatioBar, SimpleBars } from "@/components/charts";
import { formatNumber, formatPercent } from "@/lib/domain";

export const metadata = { title: "Kaynaklar" };
export const dynamic = "force-dynamic";

export default async function KaynaklarPage() {
  await requireUser();
  const [perf, huni] = await Promise.all([kaynakPerformans(30), donusumHunisi(30)]);

  const toplamBasvuru = perf.reduce((s, r) => s + r.toplam, 0);
  const enVerimli = [...perf].sort((a, b) => b.olumluOrani - a.olumluOrani)[0];
  const enCok = perf[0];
  const enDusukMaliyet = [...perf].filter((r) => r.toplam > 0).sort((a, b) => a.maliyet - b.maliyet)[0];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={FileText} tone="blue" title="Toplam Başvuru" value={toplamBasvuru} deltaLabel="Son 30 gün" delta={null} />
        <StatCard icon={UsersRound} tone="purple" title="Toplam Kaynak Sayısı" value={perf.length} deltaLabel="Son 30 gün" delta={null} />
        <StatCard icon={Award} tone="green" title="En Verimli Kaynak" value={enVerimli?.ad ?? "—"} suffix={`Olumlu Oranı ${formatPercent(enVerimli?.olumluOrani ?? 0, 0)}`} />
        <StatCard icon={BarChart3} tone="orange" title="En Çok Başvuru Gelen" value={enCok?.ad ?? "—"} suffix={`${formatNumber(enCok?.toplam ?? 0)} Başvuru`} />
        <StatCard icon={TrendingUp} tone="cyan" title="En Yüksek Olumlu Oranı" value={enVerimli?.ad ?? "—"} suffix={formatPercent(enVerimli?.olumluOrani ?? 0, 0)} />
        <StatCard icon={Coins} tone="indigo" title="En Düşük Maliyetli Kaynak" value={enDusukMaliyet?.ad ?? "—"} suffix={`${enDusukMaliyet?.maliyet.toLocaleString("tr-TR")} ₺/Aday`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">
            Kaynaklara Göre Başvuru Dağılımı <span className="font-normal text-muted">(Son 30 Gün)</span>
          </h3>
          <SimpleBars
            data={perf.map((r) => ({ name: r.ad, value: r.toplam }))}
            color="#8b5cf6"
            height={240}
            angled
          />
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Kaynaklara Göre Olumlu Aday Oranı (%)</h3>
          <SimpleBars
            data={[...perf].sort((a, b) => b.olumluOrani - a.olumluOrani).map((r) => ({
              name: r.ad,
              value: Math.round(r.olumluOrani * 10) / 10,
            }))}
            color="#10b981"
            height={240}
            angled
          />
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Kaynaklara Göre Maliyet / Aday (₺)</h3>
          <SimpleBars
            data={[...perf].sort((a, b) => a.maliyet - b.maliyet).map((r) => ({
              name: r.ad,
              value: r.maliyet,
            }))}
            color="#f59e0b"
            height={240}
            angled
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">
        <Card className="p-4 sm:p-5">
          <h3 className="mb-4 text-[15px] font-semibold">Başvuru → Olumlu → İşe Dönüşüm Oranı</h3>
          <Funnel
            steps={[
              { label: "Toplam Başvuru", value: huni.toplam, color: "#8b5cf6" },
              { label: "Olumlu Aday", value: huni.olumlu, color: "#3b82f6" },
              { label: "Projeye Yönlendirilen", value: huni.yonlendirilen, color: "#10b981" },
              { label: "İşe Başlayan", value: huni.iseBaslayan, color: "#f59e0b" },
            ]}
          />
          <ul className="mt-4 space-y-2 text-xs">
            {[
              ["Toplam Başvuru", huni.toplam, "#8b5cf6", 100],
              ["Olumlu Aday", huni.olumlu, "#3b82f6", huni.toplam ? (huni.olumlu / huni.toplam) * 100 : 0],
              ["Projeye Yönlendirilen", huni.yonlendirilen, "#10b981", huni.toplam ? (huni.yonlendirilen / huni.toplam) * 100 : 0],
              ["İşe Başlayan", huni.iseBaslayan, "#f59e0b", huni.toplam ? (huni.iseBaslayan / huni.toplam) * 100 : 0],
            ].map(([label, value, color, oran]) => (
              <li key={label as string} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color as string }} />
                <span className="text-slate-600">{label}</span>
                <span className="ml-auto font-semibold">
                  {formatNumber(value as number)}{" "}
                  <span className="font-normal text-muted">({formatPercent(oran as number)})</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3 className="border-b border-line px-4 py-4 text-[15px] font-semibold">
            Kaynak Performans Tablosu
          </h3>
          <div className="table-scroll">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[11px] text-muted">
                  {[
                    "Kaynak", "Toplam Başvuru", "Olumlu", "Olumsuz", "Beklemede", "Ulaşılamadı",
                    "Olumlu Oranı", "Projeye Yönlendirilen", "İşe Başlayan", "İşe Başlama Oranı",
                    "Maliyet / Aday (₺)", "Kaynak Verimlilik Skoru",
                  ].map((h) => (
                    <th key={h} className="px-3 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perf.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap">{r.ad}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(r.toplam)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(r.olumlu)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(r.olumsuz)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(r.beklemede)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(r.ulasilamadi)}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-11 text-right font-medium">{formatPercent(r.olumluOrani, 1)}</span>
                        <RatioBar value={r.olumluOrani} />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(r.yonlendirilen)}</td>
                    <td className="px-3 py-2.5 text-right">{formatNumber(r.iseBaslayan)}</td>
                    <td className="px-3 py-2.5">
                      <span className="flex items-center gap-2">
                        <span className="w-11 text-right font-medium">{formatPercent(r.iseBaslamaOrani, 1)}</span>
                        <RatioBar value={r.iseBaslamaOrani} color="#2563eb" />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">{r.maliyet.toLocaleString("tr-TR")} ₺</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex h-7 w-9 items-center justify-center rounded-md bg-emerald-50 text-[12px] font-bold text-emerald-600">
                        {r.skor}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
