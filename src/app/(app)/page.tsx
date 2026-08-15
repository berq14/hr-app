import Link from "next/link";
import {
  FileText,
  UserRoundCheck,
  CircleSlash,
  UsersRound,
  Plus,
  Upload,
  Download,
  Phone,
  Eye,
  EllipsisVertical,
  PhoneCall,
  UserRound,
  PhoneOff,
  TrendingUp,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import {
  dashboardStats,
  kaynakDagilimi,
  gunlukTrend,
  callCenterOzet,
  listCandidates,
  filterOptions,
} from "@/lib/queries";
import { StatCard } from "@/components/stat-card";
import { Card, Badge, Avatar, durumBadgeColor, btnPrimary, btnSecondary, cx } from "@/components/ui";
import { DonutRow, TrendLine } from "@/components/charts";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { DURUM_ETIKETLERI, formatDateTime, formatNumber, formatPercent } from "@/lib/domain";
import type { CandidateStatus } from "@prisma/client";

export const metadata = { title: "Ana Ekran" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function AnaEkran({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const sekme = s(sp.sekme) ?? "tumu";
  const durum =
    sekme === "olumlu" ? "OLUMLU" : sekme === "olumsuz" ? "OLUMSUZ" : "TUMU";

  const [stats, kaynaklar, trend, cc, liste, opts] = await Promise.all([
    dashboardStats(),
    kaynakDagilimi(30),
    gunlukTrend(7),
    callCenterOzet(7),
    listCandidates({
      durum: durum as CandidateStatus | "TUMU",
      q: s(sp.q),
      pozisyon: s(sp.pozisyon),
      proje: s(sp.proje),
      kaynak: s(sp.kaynak),
      from: s(sp.from),
      to: s(sp.to),
      sayfa: Number(s(sp.sayfa) ?? 1),
      adet: 9,
    }),
    filterOptions(),
  ]);

  const sekmeler = [
    { key: "tumu", label: "Tüm Başvurular" },
    { key: "olumlu", label: "Olumlu Adaylar" },
    { key: "olumsuz", label: "Olumsuz Adaylar" },
  ];

  return (
    <div className="space-y-5">
      {/* üst eylemler */}
      <div className="flex flex-wrap justify-end gap-2.5">
        <Link href="/adaylar/yeni" className={btnPrimary}>
          <Plus className="h-4 w-4" /> Yeni Başvuru
        </Link>
        <Link href="/import" className={btnSecondary}>
          <Upload className="h-4 w-4" /> Toplu Aday Aktar
        </Link>
        <a href="/api/adaylar/disa-aktar" className={btnSecondary}>
          <Download className="h-4 w-4" /> Dışa Aktar
        </a>
      </div>

      {/* istatistik kartları */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} tone="blue" title="Toplam Başvuru" value={stats.toplam.value} delta={stats.toplam.delta} href="/adaylar" />
        <StatCard icon={UserRoundCheck} tone="green" title="Olumlu Adaylar" value={stats.olumlu.value} delta={stats.olumlu.delta} href="/adaylar/olumlu" />
        <StatCard icon={CircleSlash} tone="red" title="Olumsuz Adaylar" value={stats.olumsuz.value} delta={stats.olumsuz.delta} href="/adaylar/olumsuz" />
        <StatCard icon={UsersRound} tone="purple" title="Bekleyen (Aranmayı Bekleyen)" value={stats.bekleyen.value} delta={stats.bekleyen.delta} href="/adaylar?durum=BEKLEMEDE" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* başvuru tablosu */}
        <Card className="min-w-0">
          <div className="flex gap-1 overflow-x-auto border-b border-line px-4 pt-2">
            {sekmeler.map((t) => (
              <Link
                key={t.key}
                href={t.key === "tumu" ? "/" : `/?sekme=${t.key}`}
                className={cx(
                  "whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition",
                  sekme === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="border-b border-line p-4">
            <FilterBar
              filtreler={[
                { tip: "tarih-araligi", adFrom: "from", adTo: "to", etiket: "Tarih Aralığı" },
                { tip: "select", ad: "kaynak", etiket: "Kaynak", secenekler: opts.sources.map((x) => ({ value: x.id, label: x.ad })) },
                { tip: "select", ad: "pozisyon", etiket: "Pozisyon", secenekler: opts.positions.map((x) => ({ value: x.id, label: x.ad })) },
                { tip: "select", ad: "proje", etiket: "Proje", secenekler: opts.projects.map((x) => ({ value: x.id, label: x.ad })) },
              ]}
            />
          </div>
          <div className="table-scroll">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Aday Adı</th>
                  <th className="px-4 py-3 font-medium">Pozisyon</th>
                  <th className="px-4 py-3 font-medium">Proje</th>
                  <th className="px-4 py-3 font-medium">Kaynak</th>
                  <th className="px-4 py-3 font-medium">Başvuru Tarihi</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {liste.rows.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <Link href={`/adaylar/${c.id}`} className="flex items-center gap-2.5 font-medium">
                        <Avatar name={c.adSoyad} />
                        {c.adSoyad}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{c.position?.ad ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.project?.ad ?? "—"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.source?.ad ?? "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{formatDateTime(c.basvuruTarihi)}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={durumBadgeColor(c.durum)}>{DURUM_ETIKETLERI[c.durum]}</Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1">
                        <Link href={`/adaylar/${c.id}#aramalar`} className="rounded-lg p-1.5 text-primary hover:bg-blue-50" aria-label="Aramalar">
                          <Phone className="h-4 w-4" />
                        </Link>
                        <Link href={`/adaylar/${c.id}`} className="rounded-lg p-1.5 text-primary hover:bg-blue-50" aria-label="Görüntüle">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link href={`/adaylar/${c.id}`} className="rounded-lg p-1.5 text-muted hover:bg-slate-100" aria-label="Diğer">
                          <EllipsisVertical className="h-4 w-4" />
                        </Link>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-[13px] text-muted">
              Toplam <span className="font-semibold text-foreground">{formatNumber(liste.toplam)}</span> kayıt
            </p>
            <Pagination base="/" params={sp as Record<string, string>} sayfa={liste.sayfa} sayfaSayisi={liste.sayfaSayisi} />
          </div>
        </Card>

        {/* sağ sütun */}
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <h3 className="text-[15px] font-semibold">Başvuruların Kaynak Dağılımı</h3>
            <div className="mt-2">
              <DonutRow data={kaynaklar} />
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-[15px] font-semibold">
              Günlük Başvuru Trendi <span className="font-normal text-muted">(Son 7 Gün)</span>
            </h3>
            <div className="mt-3">
              <TrendLine data={trend.map((t) => ({ name: t.name, value: t.Toplam }))} height={160} />
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-[15px] font-semibold">
              Yapay Zeka Call Center Performansı <span className="font-normal text-muted">(Son 7 Gün)</span>
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                { icon: PhoneCall, label: "Aranan Aday", value: formatNumber(cc.arananAday) },
                { icon: UserRound, label: "Görüşme Yapılan", value: formatNumber(cc.gorusmeYapilan) },
                { icon: PhoneOff, label: "Ulaşılamayan", value: formatNumber(cc.ulasilamayan), red: true },
                { icon: TrendingUp, label: "Başarı Oranı", value: formatPercent(cc.basariOrani), green: true },
              ].map((k) => (
                <div key={k.label} className="rounded-xl border border-line p-3">
                  <span className={cx("flex items-center gap-1.5 text-xs", k.red ? "text-red-500" : k.green ? "text-emerald-600" : "text-slate-500")}>
                    <k.icon className="h-3.5 w-3.5" /> {k.label}
                  </span>
                  <p className="mt-1.5 text-xl font-bold">{k.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
