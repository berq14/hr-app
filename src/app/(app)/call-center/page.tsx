import {
  PhoneCall,
  UserRoundCheck,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CircleX,
  MessageSquareText,
  Download,
} from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  aramaGecmisi,
  aramaGunluk,
  callCenterStats,
  kacinciAramadaUlasildi,
  saatlereGoreYogunluk,
  smsSonuclari,
  sonucDagilimi,
} from "@/lib/callcenter";
import { decryptField } from "@/lib/crypto";
import { StatCard } from "@/components/stat-card";
import { Card, Badge, Avatar, durumBadgeColor, btnSecondary } from "@/components/ui";
import {
  DonutRow,
  SimpleBars,
  TrendLine,
  SONUC_RENK,
} from "@/components/charts";
import { FilterBar } from "@/components/filter-bar";
import { Pagination } from "@/components/pagination";
import { CALL_SONUCLARI, formatDateTime, formatNumber, formatPhone } from "@/lib/domain";
import { decryptCandidate } from "@/lib/candidates";

export const metadata = { title: "Yapay Zeka Call Center" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const s = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

const SMS_RENK: Record<string, string> = {
  "SMS Gönderildi": "#2563eb",
  "SMS Okundu": "#10b981",
  "Linke Tıklandı": "#f59e0b",
  "Başvuru Yapan": "#ef4444",
};

export default async function CallCenterPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  await requireUser();
  const sp = await searchParams;

  const [stats, gunluk, sonuc, kacinci, saatlik, sms, gecmis] = await Promise.all([
    callCenterStats(30),
    aramaGunluk(14),
    sonucDagilimi(30),
    kacinciAramadaUlasildi(30),
    saatlereGoreYogunluk(30),
    smsSonuclari(30),
    aramaGecmisi({
      q: s(sp.q),
      sonuc: s(sp.sonuc),
      kacinci: s(sp.kacinci) ? Number(s(sp.kacinci)) : undefined,
      sayfa: Number(s(sp.sayfa) ?? 1),
    }),
  ]);

  const durumBar = [
    { name: "Ulaşıldı", value: stats.ulasilan.value, color: "#2563eb" },
    { name: "Ulaşılamadı", value: stats.toplam.value - stats.ulasilan.value - stats.hatali.value, color: "#3b82f6" },
    { name: "Hatalı Numara", value: stats.hatali.value, color: "#60a5fa" },
    { name: "SMS Gönderildi", value: stats.sms.value, color: "#2563eb" },
  ];
  const maxDurum = Math.max(...durumBar.map((d) => d.value), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
        <StatCard icon={PhoneCall} tone="blue" title="Toplam Arama" value={stats.toplam.value} delta={stats.toplam.delta} />
        <StatCard icon={UserRoundCheck} tone="cyan" title="Ulaşılan Kişi" value={stats.ulasilan.value} delta={stats.ulasilan.delta} />
        <StatCard icon={ThumbsUp} tone="green" title="Olumlu" value={stats.olumlu.value} delta={stats.olumlu.delta} />
        <StatCard icon={ThumbsDown} tone="red" title="Olumsuz" value={stats.olumsuz.value} delta={stats.olumsuz.delta} />
        <StatCard icon={Clock} tone="orange" title="Beklemede" value={stats.beklemede.value} delta={stats.beklemede.delta} />
        <StatCard icon={CircleX} tone="purple" title="Hatalı Numara" value={stats.hatali.value} delta={stats.hatali.delta} />
        <StatCard icon={MessageSquareText} tone="indigo" title="Gönderilen SMS" value={stats.sms.value} delta={stats.sms.delta} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">
            Günlere Göre Arama Dağılımı <span className="font-normal text-muted">(Son 14 Gün)</span>
          </h3>
          <TrendLine data={gunluk} height={200} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">
            Sonuç Dağılımı <span className="font-normal text-muted">(Son 30 Gün)</span>
          </h3>
          <DonutRow data={sonuc} height={170} colorMap={SONUC_RENK} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Kaçıncı Aramada Ulaşıldı?</h3>
          <SimpleBars data={kacinci} height={200} color="#8b5cf6" />
        </Card>

        <Card className="p-4 sm:p-5">
          <h3 className="mb-4 text-[15px] font-semibold">Arama Durum Dağılımı</h3>
          <ul className="space-y-4">
            {durumBar.map((d) => (
              <li key={d.name}>
                <span className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-600">{d.name}</span>
                  <span className="font-semibold">{formatNumber(d.value)}</span>
                </span>
                <span className="block h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(d.value / maxDurum) * 100}%`, background: d.color }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">Saatlere Göre Arama Yoğunluğu</h3>
          <TrendLine data={saatlik} height={200} area={false} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h3 className="mb-3 text-[15px] font-semibold">
            SMS Sonuçları <span className="font-normal text-muted">(Son 30 Gün)</span>
          </h3>
          <DonutRow data={sms} height={170} colorMap={SMS_RENK} />
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
          <h3 className="text-[15px] font-semibold">Arama Geçmişi</h3>
          <a href="/api/adaylar/disa-aktar" className={btnSecondary}>
            <Download className="h-4 w-4" /> Dışa Aktar
          </a>
        </div>
        <div className="border-b border-line p-4">
          <FilterBar
            arama={{ placeholder: "Ad soyad, telefon veya pozisyon ara..." }}
            filtreler={[
              { tip: "select", ad: "sonuc", etiket: "Sonuç", secenekler: CALL_SONUCLARI.map((x) => ({ value: x, label: x })) },
              { tip: "select", ad: "kacinci", etiket: "Kaçıncı Arama", secenekler: [1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}. Arama` })) },
            ]}
          />
        </div>
        <div className="table-scroll">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {["Ad Soyad", "Telefon", "Pozisyon", "Arama Tarihi", "Kaçıncı Arama", "Görüşme Süresi", "Sonuç", "SMS Durumu", "Not"].map((h) => (
                  <th key={h} className="px-3.5 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gecmis.rows.map((r) => {
                const aday = decryptCandidate(r.candidate);
                return (
                  <tr key={r.id} className="border-b border-line/60 hover:bg-slate-50/60">
                    <td className="px-3.5 py-2.5">
                      <Link href={`/adaylar/${aday.id}`} className="flex items-center gap-2.5 font-medium whitespace-nowrap">
                        <Avatar name={aday.adSoyad} />
                        {aday.adSoyad}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">{formatPhone(aday.telefon)}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">{r.candidate.position?.ad ?? "—"}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">{formatDateTime(r.aramaTarihi)}</td>
                    <td className="px-3.5 py-2.5">{r.kacinciArama}. Arama</td>
                    <td className="px-3.5 py-2.5">
                      {r.gorusmeSuresiSn
                        ? `${String(Math.floor(r.gorusmeSuresiSn / 60)).padStart(2, "0")}:${String(r.gorusmeSuresiSn % 60).padStart(2, "0")}`
                        : "—"}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Badge color={durumBadgeColor(r.sonuc)}>{r.sonuc}</Badge>
                    </td>
                    <td className="px-3.5 py-2.5">{r.smsDurumu ?? "—"}</td>
                    <td className="px-3.5 py-2.5 text-slate-600">{decryptField(r.notlar) ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-[13px] text-muted">
            Toplam <span className="font-semibold text-foreground">{formatNumber(gecmis.toplam)}</span> kayıt
          </p>
          <Pagination base="/call-center" params={sp as Record<string, string>} sayfa={gecmis.sayfa} sayfaSayisi={gecmis.sayfaSayisi} />
        </div>
      </Card>
    </div>
  );
}
