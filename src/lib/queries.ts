import "server-only";
import type { Prisma, CandidateStatus } from "@prisma/client";
import { db } from "./db";

/** Ortak sorgular ve toplulaştırmalar. */

export function last30(): { from: Date; to: Date; prevFrom: Date } {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 86400_000);
  const prevFrom = new Date(Date.now() - 60 * 86400_000);
  return { from, to, prevFrom };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export async function dashboardStats() {
  const { from, prevFrom } = last30();
  const count = (where: Prisma.CandidateWhereInput) => db.candidate.count({ where });
  const [toplam, toplamOnceki, olumlu, olumluOnceki, olumsuz, olumsuzOnceki, bekleyen, bekleyenOnceki] =
    await Promise.all([
      count({ basvuruTarihi: { gte: from } }),
      count({ basvuruTarihi: { gte: prevFrom, lt: from } }),
      count({ basvuruTarihi: { gte: from }, durum: "OLUMLU" }),
      count({ basvuruTarihi: { gte: prevFrom, lt: from }, durum: "OLUMLU" }),
      count({ basvuruTarihi: { gte: from }, durum: "OLUMSUZ" }),
      count({ basvuruTarihi: { gte: prevFrom, lt: from }, durum: "OLUMSUZ" }),
      count({ basvuruTarihi: { gte: from }, durum: "BEKLEMEDE" }),
      count({ basvuruTarihi: { gte: prevFrom, lt: from }, durum: "BEKLEMEDE" }),
    ]);
  return {
    toplam: { value: toplam, delta: pctChange(toplam, toplamOnceki) },
    olumlu: { value: olumlu, delta: pctChange(olumlu, olumluOnceki) },
    olumsuz: { value: olumsuz, delta: pctChange(olumsuz, olumsuzOnceki) },
    bekleyen: { value: bekleyen, delta: pctChange(bekleyen, bekleyenOnceki) },
  };
}

export async function kaynakDagilimi(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const rows = await db.candidate.groupBy({
    by: ["sourceId"],
    where: { basvuruTarihi: { gte: from } },
    _count: { _all: true },
  });
  const sources = await db.source.findMany();
  const byId = Object.fromEntries(sources.map((s) => [s.id, s.ad]));
  const named = rows
    .map((r) => ({
      name: r.sourceId ? byId[r.sourceId] ?? "Diğer" : "Diğer",
      value: r._count._all,
    }))
    .sort((a, b) => b.value - a.value);
  // ilk 5 + diğer
  const top = named.slice(0, 5);
  const rest = named.slice(5).reduce((s, r) => s + r.value, 0);
  if (rest > 0) top.push({ name: "Diğer", value: rest });
  return top;
}

export async function gunlukTrend(days = 7) {
  const from = new Date(Date.now() - (days - 1) * 86400_000);
  from.setHours(0, 0, 0, 0);
  const rows = await db.candidate.findMany({
    where: { basvuruTarihi: { gte: from } },
    select: { basvuruTarihi: true, durum: true },
  });
  const out: { name: string; Toplam: number; Olumlu: number; Olumsuz: number; Beklemede: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86400_000);
    const label = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
    const dayRows = rows.filter(
      (r) => r.basvuruTarihi.toDateString() === d.toDateString()
    );
    out.push({
      name: label,
      Toplam: dayRows.length,
      Olumlu: dayRows.filter((r) => r.durum === "OLUMLU").length,
      Olumsuz: dayRows.filter((r) => r.durum === "OLUMSUZ").length,
      Beklemede: dayRows.filter((r) => r.durum === "BEKLEMEDE").length,
    });
  }
  return out;
}

export async function callCenterOzet(days = 7) {
  const from = new Date(Date.now() - days * 86400_000);
  const [toplam, ulasilan, ulasilamayan, olumlu] = await Promise.all([
    db.callRecord.count({ where: { aramaTarihi: { gte: from } } }),
    db.callRecord.count({
      where: { aramaTarihi: { gte: from }, sonuc: { in: ["Olumlu", "Olumsuz", "Beklemede"] } },
    }),
    db.callRecord.count({
      where: { aramaTarihi: { gte: from }, sonuc: { in: ["Ulaşılamadı", "Hatalı Numara"] } },
    }),
    db.callRecord.count({ where: { aramaTarihi: { gte: from }, sonuc: "Olumlu" } }),
  ]);
  return {
    arananAday: toplam,
    gorusmeYapilan: ulasilan,
    ulasilamayan,
    basariOrani: toplam > 0 ? (ulasilan / toplam) * 100 : 0,
    olumlu,
  };
}

// ─── Aday listesi ──────────────────────────────────────────────────

export type CandidateFilters = {
  q?: string;
  durum?: CandidateStatus | "TUMU";
  pozisyon?: string;
  kaynak?: string;
  proje?: string;
  il?: string;
  ilce?: string;
  onMulakat?: string;
  from?: string;
  to?: string;
  sayfa?: number;
  adet?: number;
};

export function buildCandidateWhere(f: CandidateFilters): Prisma.CandidateWhereInput {
  const where: Prisma.CandidateWhereInput = {};
  if (f.durum && f.durum !== "TUMU") where.durum = f.durum;
  if (f.pozisyon) where.positionId = f.pozisyon;
  if (f.kaynak) where.sourceId = f.kaynak;
  if (f.proje) where.projectId = f.proje;
  if (f.il) where.il = f.il;
  if (f.ilce) where.ilce = f.ilce;
  if (f.onMulakat) where.onMulakatSonucu = f.onMulakat;
  if (f.from || f.to) {
    where.basvuruTarihi = {};
    if (f.from) where.basvuruTarihi.gte = new Date(f.from);
    if (f.to) {
      const t = new Date(f.to);
      t.setHours(23, 59, 59, 999);
      where.basvuruTarihi.lte = t;
    }
  }
  if (f.q) {
    const q = f.q.toLocaleLowerCase("tr-TR").trim();
    where.OR = [{ adSoyadIndex: { contains: q } }];
  }
  return where;
}

export async function listCandidates(f: CandidateFilters) {
  const sayfa = Math.max(1, f.sayfa ?? 1);
  const adet = Math.min(50, Math.max(5, f.adet ?? 10));
  const where = buildCandidateWhere(f);
  const [toplam, rows] = await Promise.all([
    db.candidate.count({ where }),
    db.candidate.findMany({
      where,
      include: { position: true, source: true, project: true },
      orderBy: { basvuruTarihi: "desc" },
      skip: (sayfa - 1) * adet,
      take: adet,
    }),
  ]);
  return { toplam, rows, sayfa, adet, sayfaSayisi: Math.max(1, Math.ceil(toplam / adet)) };
}

export async function filterOptions() {
  const [positions, sources, projects, iller] = await Promise.all([
    db.position.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } }),
    db.source.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } }),
    db.project.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } }),
    db.candidate.findMany({ select: { il: true }, distinct: ["il"], where: { il: { not: null } } }),
  ]);
  return {
    positions,
    sources,
    projects,
    iller: iller.map((r) => r.il!).sort((a, b) => a.localeCompare(b, "tr")),
  };
}
