import { NextRequest, NextResponse } from "next/server";
import { getSession, getClientIp } from "@/lib/auth";
import { MAX_FILE_BYTES, parseFile, runImport } from "@/lib/import";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSession();
  if (!user?.twoFaOk) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (user.role === "IK_ASISTANI") {
    return NextResponse.json({ error: "Toplu aktarım için yetkiniz yok." }, { status: 403 });
  }

  const rl = rateLimit(`import:${user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Çok fazla deneme. ${rl.retryAfterSn} sn sonra tekrar deneyin.` },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const file = form.get("dosya");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Dosya 8 MB sınırını aşıyor." }, { status: 413 });
  }
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!["xlsx", "xls", "csv", "txt", "json"].includes(ext)) {
    return NextResponse.json(
      { error: "Yalnızca xlsx, csv veya json dosyaları yüklenebilir." },
      { status: 415 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawRows = await parseFile(file.name, buffer);
    const result = await runImport({
      filename: file.name,
      tip: ext === "xls" ? "xlsx" : ext === "txt" ? "csv" : ext,
      rawRows,
      userId: user.id,
    });
    await audit({
      userId: user.id,
      eylem: "toplu-aktarim",
      varlik: "ImportBatch",
      varlikId: result.batchId,
      detay: { dosya: file.name, toplam: result.toplam, basarili: result.basarili },
      ip: getClientIp(request.headers),
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Dosya işlenemedi.";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
