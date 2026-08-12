import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession, getClientIp } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCandidateWhere } from "@/lib/queries";
import { decryptCandidate } from "@/lib/candidates";
import { audit } from "@/lib/audit";
import { formatPhone } from "@/lib/domain";
import type { CandidateStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_EXPORT = 20_000;

export async function GET(request: NextRequest) {
  const user = await getSession();
  if (!user?.twoFaOk) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  // dışa aktarım asistan rolüne kapalı
  if (user.role === "IK_ASISTANI") {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const where = buildCandidateWhere({
    q: sp.get("q") ?? undefined,
    durum: (sp.get("durum") as CandidateStatus) ?? "TUMU",
    pozisyon: sp.get("pozisyon") ?? undefined,
    kaynak: sp.get("kaynak") ?? undefined,
    proje: sp.get("proje") ?? undefined,
    il: sp.get("il") ?? undefined,
    ilce: sp.get("ilce") ?? undefined,
    onMulakat: sp.get("mulakat") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  });

  const rows = await db.candidate.findMany({
    where,
    include: { position: true, source: true, project: true },
    orderBy: { basvuruTarihi: "desc" },
    take: MAX_EXPORT,
  });

  await audit({
    userId: user.id,
    eylem: "disa-aktar",
    varlik: "Candidate",
    detay: { adet: rows.length, filtre: Object.fromEntries(sp.entries()) },
    ip: getClientIp(request.headers),
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Adaylar");
  ws.columns = [
    { header: "Ad Soyad", key: "adSoyad", width: 24 },
    { header: "Doğum Tarihi", key: "dogum", width: 14 },
    { header: "Cinsiyet", key: "cinsiyet", width: 10 },
    { header: "Tel No", key: "tel", width: 16 },
    { header: "İl", key: "il", width: 12 },
    { header: "İlçe", key: "ilce", width: 14 },
    { header: "Başvurulan Pozisyon", key: "pozisyon", width: 22 },
    { header: "Proje", key: "proje", width: 26 },
    { header: "Başvuru Kaynağı", key: "kaynak", width: 18 },
    { header: "Başvuru Tarihi", key: "tarih", width: 18 },
    { header: "Öğrenim Durumu", key: "ogrenim", width: 14 },
    { header: "Engellilik", key: "engel", width: 10 },
    { header: "Emeklilik", key: "emekli", width: 10 },
    { header: "Askerlik", key: "askerlik", width: 10 },
    { header: "Durum", key: "durum", width: 12 },
    { header: "Ön Mülakat Sonucu", key: "mulakat", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const r of rows) {
    const c = decryptCandidate(r);
    ws.addRow({
      adSoyad: c.adSoyad,
      dogum: c.dogumTarihi ?? "",
      cinsiyet: c.cinsiyet ?? "",
      tel: formatPhone(c.telefon),
      il: c.il ?? "",
      ilce: c.ilce ?? "",
      pozisyon: r.position?.ad ?? "",
      proje: r.project?.ad ?? "",
      kaynak: r.source?.ad ?? "",
      tarih: r.basvuruTarihi.toLocaleString("tr-TR"),
      ogrenim: c.ogrenimDurumu ?? "",
      engel: c.engellilikDurumu ? "Evet" : "Hayır",
      emekli: c.emeklilikDurumu ? "Evet" : "Hayır",
      askerlik: c.askerlikDurumu ?? "",
      durum: c.durum,
      mulakat: c.onMulakatSonucu ?? "",
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const tarih = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="luna-adaylar-${tarih}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
