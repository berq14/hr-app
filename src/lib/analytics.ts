import "server-only";
import { db } from "./db";

/** Analiz & Raporlar, Kaynaklar ve Norm Kadro ekranları için toplulaştırmalar. */

function dayLabel(d: Date): string {
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

function startOfDaysAgo(n: number): Date {
  const d = new Date(Date.now() - n * 86400_000);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function ulasimDurumuGunluk(days = 7) {
  const from = startOfDaysAgo(days - 1);
  const [adaylar, aramalar] = await Promise.all([
    db.candidate.findMany({
      where: { basvuruTarihi: { gte: from } },
      select: { basvuruTarihi: true },
    }),
    db.callRecord.findMany({
      where: { aramaTarihi: { gte: from } },
      select: { aramaTarihi: true, sonuc: true },
    }),
  ]);
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 86400_000);
    const key = d.toDateString();
    const gunAramalar = aramalar.filter((a) => a.aramaTarihi.toDateString() === key);
    const ulasilan = gunAramalar.filter((a) =>
      ["Olumlu", "Olumsuz", "Beklemede"].includes(a.sonuc)
    ).length;
    out.push({
      name: dayLabel(d),
      "Toplam Aday": adaylar.filter((c) => c.basvuruTarihi.toDateString() === key).length,
      "Aranan Aday": gunAramalar.length,
      "Ulaşılan Aday": ulasilan,
      "Ulaşılamayan Aday": gunAramalar.length - ulasilan,
    });
  }
  return out;
}

export async function onMulakatOranlari(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const rows = await db.candidate.groupBy({
    by: ["durum"],
    where: { basvuruTarihi: { gte: from } },
    _count: { _all: true },
  });
  const get = (d: string) => rows.find((r) => r.durum === d)?._count._all ?? 0;
  return [
    { name: "Olumlu", value: get("OLUMLU") },
    { name: "Olumsuz", value: get("OLUMSUZ") },
    { name: "Beklemede", value: get("BEKLEMEDE") },
  ];
}

export async function ikUzmaniDagilimi() {
  const rows = await db.candidate.groupBy({
    by: ["uploadedById", "durum"],
    _count: { _all: true },
  });
  const users = await db.user.findMany({ select: { id: true, name: true } });
  const byUser = new Map<
    string,
    { ad: string; toplam: number; olumlu: number; olumsuz: number; beklemede: number }
  >();
  for (const r of rows) {
    if (!r.uploadedById) continue;
    const u = users.find((x) => x.id === r.uploadedById);
    if (!u) continue;
    const e = byUser.get(u.id) ?? { ad: u.name, toplam: 0, olumlu: 0, olumsuz: 0, beklemede: 0 };
    e.toplam += r._count._all;
    if (r.durum === "OLUMLU") e.olumlu += r._count._all;
    else if (r.durum === "OLUMSUZ") e.olumsuz += r._count._all;
    else if (r.durum === "BEKLEMEDE") e.beklemede += r._count._all;
    byUser.set(u.id, e);
  }
  return [...byUser.values()]
    .map((e) => ({ ...e, olumluOrani: e.toplam ? (e.olumlu / e.toplam) * 100 : 0 }))
    .sort((a, b) => b.toplam - a.toplam);
}

export async function ogrenimDagilimi(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const rows = await db.candidate.groupBy({
    by: ["ogrenimDurumu"],
    where: { basvuruTarihi: { gte: from } },
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ name: r.ogrenimDurumu ?? "Diğer", value: r._count._all }))
    .sort((a, b) => b.value - a.value);
}

export async function aylikRapor(aySayisi = 5) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < aySayisi; i++) {
    const ay = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const sonraki = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const where = { basvuruTarihi: { gte: ay, lt: sonraki } };
    const [toplam, olumlu, olumsuz, beklemede] = await Promise.all([
      db.candidate.count({ where }),
      db.candidate.count({ where: { ...where, durum: "OLUMLU" } }),
      db.candidate.count({ where: { ...where, durum: "OLUMSUZ" } }),
      db.candidate.count({ where: { ...where, durum: "BEKLEMEDE" } }),
    ]);
    out.push({
      donem: ay.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
      toplam,
      olumlu,
      olumsuz,
      beklemede,
      olumluOrani: toplam ? (olumlu / toplam) * 100 : 0,
    });
  }
  return out;
}

// ─── Kaynaklar ekranı ──────────────────────────────────────────────

export async function kaynakPerformans(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const sources = await db.source.findMany({ where: { aktif: true } });
  const rows = await db.candidate.findMany({
    where: { basvuruTarihi: { gte: from } },
    select: {
      sourceId: true,
      durum: true,
      projeYonlendirildi: true,
      iseBaslama: true,
    },
  });
  const out = sources.map((s) => {
    const mine = rows.filter((r) => r.sourceId === s.id);
    const toplam = mine.length;
    const olumlu = mine.filter((r) => r.durum === "OLUMLU").length;
    const olumsuz = mine.filter((r) => r.durum === "OLUMSUZ").length;
    const beklemede = mine.filter((r) => r.durum === "BEKLEMEDE").length;
    const ulasilamadi = mine.filter((r) => r.durum === "ULASILAMADI").length;
    const yonlendirilen = mine.filter((r) => r.projeYonlendirildi).length;
    const iseBaslayan = mine.filter((r) => r.iseBaslama).length;
    const olumluOrani = toplam ? (olumlu / toplam) * 100 : 0;
    const iseBaslamaOrani = olumlu ? (iseBaslayan / olumlu) * 100 : 0;
    // verimlilik skoru: olumlu oranı + işe başlama oranı - maliyet etkisi
    const skor = Math.round(
      Math.min(100, olumluOrani * 0.9 + iseBaslamaOrani * 0.4 - s.maliyet * 2)
    );
    return {
      id: s.id,
      ad: s.ad,
      toplam,
      olumlu,
      olumsuz,
      beklemede,
      ulasilamadi,
      olumluOrani,
      yonlendirilen,
      iseBaslayan,
      iseBaslamaOrani,
      maliyet: s.maliyet,
      skor: Math.max(0, skor),
    };
  });
  return out.sort((a, b) => b.toplam - a.toplam);
}

export async function donusumHunisi(days = 30) {
  const from = new Date(Date.now() - days * 86400_000);
  const where = { basvuruTarihi: { gte: from } };
  const [toplam, olumlu, yonlendirilen, iseBaslayan] = await Promise.all([
    db.candidate.count({ where }),
    db.candidate.count({ where: { ...where, durum: "OLUMLU" } }),
    db.candidate.count({ where: { ...where, projeYonlendirildi: true } }),
    db.candidate.count({ where: { ...where, iseBaslama: true } }),
  ]);
  return { toplam, olumlu, yonlendirilen, iseBaslayan };
}

// ─── Norm kadro ────────────────────────────────────────────────────

export async function normKadroOzet() {
  const projeler = await db.project.findMany({
    where: { aktif: true },
    include: {
      positions: { include: { position: true } },
      ikSorumlusu: { select: { name: true } },
    },
    orderBy: { kod: "asc" },
  });
  const rows = projeler.map((p) => {
    const my = p.positions.filter((x) => x.tip === "MY");
    const by = p.positions.filter((x) => x.tip === "BY");
    const sum = (arr: typeof my, f: "normKadro" | "aktifKadro") =>
      arr.reduce((s, x) => s + x[f], 0);
    const myNorm = sum(my, "normKadro");
    const myAktif = sum(my, "aktifKadro");
    const byNorm = sum(by, "normKadro");
    const byAktif = sum(by, "aktifKadro");
    return {
      id: p.id,
      ulke: p.ulke,
      bolge: p.bolge,
      kurum: p.kurum,
      segment: p.segment,
      ad: p.ad,
      kod: p.kod,
      il: p.il,
      ilce: p.ilce,
      masrafMerkezi: p.masrafMerkezi,
      ikSorumlusu: p.ikSorumlusu?.name ?? "—",
      myNorm,
      myAktif,
      myEksik: myNorm - myAktif,
      myEksikOrani: myNorm ? ((myNorm - myAktif) / myNorm) * 100 : 0,
      byNorm,
      byAktif,
      byEksik: byNorm - byAktif,
      byEksikOrani: byNorm ? ((byNorm - byAktif) / byNorm) * 100 : 0,
    };
  });
  const t = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0);
  return {
    rows,
    toplamProje: rows.length,
    myNorm: t((r) => r.myNorm),
    myAktif: t((r) => r.myAktif),
    myEksik: t((r) => r.myEksik),
    byNorm: t((r) => r.byNorm),
    byAktif: t((r) => r.byAktif),
    byEksik: t((r) => r.byEksik),
  };
}
