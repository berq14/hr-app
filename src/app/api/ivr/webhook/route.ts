import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import {
  getActiveQuestions,
  getSettings,
  processCallResult,
  processUnreachable,
  type CevapKaydi,
} from "@/lib/ivr/engine";

/**
 * Gerçek telefoni sağlayıcısı (Netgsm/Verimor/Asterisk...) entegre edildiğinde
 * arama sonuçlarını bu uca gönderir. Simülatörle aynı işleme hattını kullanır.
 *
 * Kimlik doğrulama: Ayarlar'dan oluşturulan API anahtarı (Bearer).
 */

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  taskId: z.string().min(1),
  durum: z.enum(["ulasildi", "ulasilamadi"]),
  gorusmeSuresiSn: z.number().int().min(0).max(7200).optional(),
  cevaplar: z
    .array(z.object({ soruId: z.string(), tus: z.string().regex(/^[0-9#*]$/) }))
    .optional(),
});

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "API anahtarı gerekli." }, { status: 401 });
  const apiKey = await db.apiKey.findUnique({ where: { keyHash: sha256(token) } });
  if (!apiKey || !apiKey.aktif) {
    return NextResponse.json({ error: "Geçersiz API anahtarı." }, { status: 401 });
  }

  const rl = rateLimit(`ivr-webhook:${apiKey.id}`, 120, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Hız sınırı aşıldı." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Doğrulama hatası", detay: parsed.error.issues.slice(0, 3) },
      { status: 422 }
    );
  }

  const task = await db.ivrCallTask.findUnique({ where: { id: parsed.data.taskId } });
  if (!task || task.durum !== "bekliyor") {
    return NextResponse.json({ error: "Görev bulunamadı veya kapalı." }, { status: 404 });
  }

  const settings = await getSettings();
  const sorular = await getActiveQuestions();

  const guncel = await db.ivrCallTask.update({
    where: { id: task.id },
    data: { denemeSayisi: { increment: 1 } },
  });

  if (parsed.data.durum === "ulasilamadi") {
    const r = await processUnreachable(guncel, settings);
    return NextResponse.json({ ok: true, sonuc: r });
  }

  const soruMap = new Map(sorular.map((s) => [s.id, s]));
  const cevaplar: CevapKaydi[] = (parsed.data.cevaplar ?? []).flatMap((c) => {
    const soru = soruMap.get(c.soruId);
    if (!soru) return [];
    return [{ soruId: c.soruId, metin: soru.metin, tus: c.tus, dogruMu: c.tus === soru.olumluTus }];
  });
  if (cevaplar.length === 0) {
    return NextResponse.json({ error: "Geçerli cevap bulunamadı." }, { status: 422 });
  }

  const sonuc = await processCallResult({
    task: guncel,
    cevaplar,
    gorusmeSuresiSn: parsed.data.gorusmeSuresiSn ?? 0,
    settings,
    sorular,
  });
  await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return NextResponse.json({ ok: true, sonuc });
}
