import {
  FileText,
  ThumbsUp,
  ThumbsDown,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { dashboardStats, gunlukTrend, kaynakDagilimi } from "@/lib/queries";
import {
  aylikRapor,
  ikUzmaniDagilimi,
  ogrenimDagilimi,
  onMulakatOranlari,
  ulasimDurumuGunluk,
} from "@/lib/analytics";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui";
import {
  DonutChart,
  DonutLegend,
  GroupedBars,
  MultiLine,
  RatioBar,
  TrendLine,
  SONUC_RENK,
} from "@/components/charts";
import { formatNumber, formatPercent } from "@/lib/domain";

export const metadata = { title: "Analiz & Raporlar" };
export const dynamic = "force-dynamic";

function ChartCard({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">
          {title}{" "}
          {sub ? <span className="font-normal text-muted">({sub})</span> : null}
        </h3>
      </div>
      {children}
    </Card>
  );
}

export default async function AnalizPage() {
  await requireUser();
  const [stats, sonucGunluk, ulasim, kaynaklar, trend, mulakat, ikDagilim, ogrenim, aylik] =
    await Promise.all([
      dashboardStats(),
      gunlukTrend(7),
      ulasimDurumuGunluk(7),
      kaynakDagilimi(30),
      gunlukTrend(7),
      onMulakatOranlari(30),
      ikUzmaniDagilimi(),
      ogrenimDagilimi(30),
      aylikRapor(5),
    ]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} tone="blue" title="Toplam Başvuru Sayısı" value={stats.toplam.value} delta={stats.toplam.delta} />
        <StatCard icon={ThumbsUp} tone="green" title="Olumlu Olan Başvuru Sayısı" value={stats.olumlu.value} delta={stats.olumlu.delta} />
        <StatCard icon={ThumbsDown} tone="red" title="Olumsuz Olan Başvuru Sayısı" value={stats.olumsuz.value} delta={stats.olumsuz.delta} />
        <StatCard icon={Clock} tone="orange" title="Beklemede Olan Başvuru Sayısı" value={stats.bekleyen.value} delta={stats.bekleyen.delta} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard title="Başvuru Sonuç Dağılımı" sub="Son 7 Gün">
          <GroupedBars
            data={sonucGunluk}
            series={[
              { key: "Toplam", color: "#2563eb", label: "Toplam Başvuru" },
              { key: "Olumlu", color: "#10b981" },
              { key: "Olumsuz", color: "#ef4444" },
              { key: "Beklemede", color: "#f59e0b" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Adaylara Ulaşım Durumu" sub="Son 7 Gün">
          <GroupedBars
            data={ulasim}
            series={[
              { key: "Toplam Aday", color: "#2563eb" },
              { key: "Aranan Aday", color: "#10b981" },
              { key: "Ulaşılan Aday", color: "#a855f7" },
              { key: "Ulaşılamayan Aday", color: "#f59e0b" },
            ]}
          />
        </ChartCard>
        <ChartCard title="Başvuru Kaynak Dağılımı" sub="Son 30 Gün">
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <DonutChart data={kaynaklar} height={150} />
            <DonutLegend data={kaynaklar} />
          </div>
        </ChartCard>

        <ChartCard title="Günlük Başvuru Trendi" sub="Son 7 Gün">
          <TrendLine data={trend.map((t) => ({ name: t.name, value: t.Toplam }))} height={190} />
        </ChartCard>
        <ChartCard title="Günlük Olumlu / Olumsuz Dağılımı" sub="Son 7 Gün">
          <MultiLine
            data={sonucGunluk}
            series={[
              { key: "Olumlu", color: "#10b981" },
              { key: "Olumsuz", color: "#ef4444" },
            ]}
            height={190}
          />
        </ChartCard>
        <ChartCard title="Ön Mülakat Sonuç Oranları" sub="Son 30 Gün">
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <DonutChart data={mulakat} height={150} colorMap={SONUC_RENK} />
            <DonutLegend data={mulakat} colorMap={SONUC_RENK} />
          </div>
        </ChartCard>

        <ChartCard title="İK Uzmanlarına Göre Aday Yükleme Dağılımı">
          <div className="table-scroll">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  {["İK Uzmanı", "Toplam Yüklenen", "Olumlu", "Olumsuz", "Beklemede", "Olumlu Oranı"].map((h) => (
                    <th key={h} className="px-2.5 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ikDagilim.slice(0, 6).map((r) => (
                  <tr key={r.ad} className="border-b border-line/60">
                    <td className="px-2.5 py-2 font-medium whitespace-nowrap">{r.ad}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.toplam)}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.olumlu)}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.olumsuz)}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.beklemede)}</td>
                    <td className="px-2.5 py-2">
                      <span className="flex items-center gap-2">
                        <RatioBar value={r.olumluOrani} />
                        <span className="font-medium">{formatPercent(r.olumluOrani, 1)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/ayarlar" className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline">
            Tüm İK Uzmanlarını Gör →
          </Link>
        </ChartCard>

        <ChartCard title="Öğrenim Durumu Dağılımı" sub="Son 30 Gün">
          <div className="grid grid-cols-[140px_1fr] items-center gap-3">
            <DonutChart data={ogrenim} height={170} />
            <DonutLegend data={ogrenim} />
          </div>
        </ChartCard>

        <ChartCard title="Aylık Karşılaştırmalı Rapor">
          <div className="table-scroll">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  {["Dönem", "Toplam Başvuru", "Olumlu", "Olumsuz", "Beklemede", "Olumlu Oranı"].map((h) => (
                    <th key={h} className="px-2.5 py-2 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aylik.map((r) => (
                  <tr key={r.donem} className="border-b border-line/60">
                    <td className="px-2.5 py-2 font-medium whitespace-nowrap">{r.donem}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.toplam)}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.olumlu)}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.olumsuz)}</td>
                    <td className="px-2.5 py-2">{formatNumber(r.beklemede)}</td>
                    <td className="px-2.5 py-2">
                      <span className="flex items-center gap-2">
                        <RatioBar value={r.olumluOrani} />
                        <span className="font-medium">{formatPercent(r.olumluOrani, 1)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      <p className="text-center text-xs text-muted">
        Veriler her 15 dakikada bir güncellenmektedir.
      </p>
    </div>
  );
}
