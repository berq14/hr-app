import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSession();
  if (!user?.twoFaOk) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Adaylar");
  ws.columns = [
    { header: "Ad Soyad", width: 24 },
    { header: "Telefon", width: 16 },
    { header: "Doğum Tarihi", width: 14 },
    { header: "Cinsiyet", width: 10 },
    { header: "E-posta", width: 22 },
    { header: "İl", width: 12 },
    { header: "İlçe", width: 14 },
    { header: "Pozisyon", width: 20 },
    { header: "Kaynak", width: 16 },
    { header: "Proje", width: 26 },
    { header: "Öğrenim Durumu", width: 16 },
    { header: "Askerlik Durumu", width: 14 },
    { header: "Engellilik", width: 10 },
    { header: "Emeklilik", width: 10 },
    { header: "Notlar", width: 30 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.addRow([
    "Örnek Aday", "0532 123 45 67", "15.05.1990", "Erkek", "ornek@eposta.com",
    "İstanbul", "Pendik", "Temizlik Personeli", "kariyer.net",
    "İstanbul Havalimanı Temizlik", "Lise", "Yapıldı", "Hayır", "Hayır", "",
  ]);

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="luna-aday-aktarim-sablonu.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
