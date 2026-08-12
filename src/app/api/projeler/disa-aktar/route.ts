import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession, getClientIp } from "@/lib/auth";
import { normKadroOzet } from "@/lib/analytics";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user?.twoFaOk) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const ozet = await normKadroOzet();
  await audit({
    userId: user.id,
    eylem: "disa-aktar",
    varlik: "Project",
    detay: { adet: ozet.rows.length },
    ip: getClientIp(new Headers(request.headers)),
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Projeler");
  ws.columns = [
    { header: "Ülke", key: "ulke", width: 10 },
    { header: "Bölge", key: "bolge", width: 14 },
    { header: "Kurum", key: "kurum", width: 22 },
    { header: "Segment", key: "segment", width: 20 },
    { header: "Proje Adı", key: "ad", width: 30 },
    { header: "Proje Kodu", key: "kod", width: 14 },
    { header: "İl", key: "il", width: 12 },
    { header: "İlçe", key: "ilce", width: 14 },
    { header: "Masraf Merkezi", key: "mm", width: 14 },
    { header: "İK Sorumlusu", key: "ik", width: 18 },
    { header: "Norm Kadro (MY)", key: "myNorm", width: 14 },
    { header: "Aktif Kadro (MY)", key: "myAktif", width: 14 },
    { header: "MY Eksik", key: "myEksik", width: 10 },
    { header: "Norm Kadro (BY)", key: "byNorm", width: 14 },
    { header: "Aktif Kadro (BY)", key: "byAktif", width: 14 },
    { header: "BY Eksik", key: "byEksik", width: 10 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of ozet.rows) {
    ws.addRow({
      ulke: r.ulke, bolge: r.bolge, kurum: r.kurum, segment: r.segment,
      ad: r.ad, kod: r.kod, il: r.il, ilce: r.ilce, mm: r.masrafMerkezi,
      ik: r.ikSorumlusu, myNorm: r.myNorm, myAktif: r.myAktif, myEksik: r.myEksik,
      byNorm: r.byNorm, byAktif: r.byAktif, byEksik: r.byEksik,
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  const tarih = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="luna-projeler-${tarih}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
