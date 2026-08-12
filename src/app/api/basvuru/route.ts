import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { encryptCandidateInput } from "@/lib/candidates";
import { hmacIndex } from "@/lib/crypto";
import { getClientIp } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isValidTrPhone, normalizePhone } from "@/lib/domain";

/** QR ile açılan herkese açık başvuru formunun gönderim ucu. */

export const dynamic = "force-dynamic";

const schema = z.object({
  slug: z.string().regex(/^[A-Za-z0-9_-]{6,80}$/),
  adSoyad: z.string().trim().min(3, "Ad Soyad en az 3 karakter olmalı.").max(120),
  telefon: z.string().trim().refine(isValidTrPhone, "Geçerli bir cep telefonu girin."),
  dogumTarihi: z
    .string()
    .trim()
    .regex(/^\d{2}\.\d{2}\.\d{4}$/, "Doğum tarihi GG.AA.YYYY biçiminde olmalı.")
    .optional()
    .or(z.literal("")),
  cinsiyet: z.enum(["Erkek", "Kadın"]).optional().or(z.literal("")),
  il: z.string().trim().min(2, "İl gerekli.").max(40),
  ilce: z.string().trim().max(60).optional().or(z.literal("")),
  pozisyon: z.string().trim().min(2, "Pozisyon seçin.").max(80),
  ogrenimDurumu: z.string().trim().max(30).optional().or(z.literal("")),
  askerlikDurumu: z.string().trim().max(20).optional().or(z.literal("")),
  engellilik: z.union([z.literal("on"), z.boolean()]).optional(),
  kvkkOnay: z.literal(true, { message: "KVKK açık rızası zorunludur." }),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers) ?? "unknown";
  // herkese açık uç — sıkı hız sınırı
  const rl = rateLimit(`basvuru:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Çok fazla deneme. ${rl.retryAfterSn} saniye sonra tekrar deneyin.` },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }
  const d = parsed.data;

  const qr = await db.qrCode.findUnique({ where: { slug: d.slug } });
  if (!qr || !qr.aktif) {
    return NextResponse.json({ error: "Başvuru formu artık aktif değil." }, { status: 404 });
  }
  const izinliPozisyonlar: string[] = JSON.parse(qr.pozisyonlar);
  if (!izinliPozisyonlar.includes(d.pozisyon)) {
    return NextResponse.json({ error: "Geçersiz pozisyon seçimi." }, { status: 422 });
  }

  // mükerrer başvuru kontrolü (aynı telefon + aynı QR, son 30 gün)
  const telIdx = hmacIndex(normalizePhone(d.telefon));
  const mevcut = await db.candidate.findFirst({
    where: {
      telefonIndex: telIdx,
      qrCodeId: qr.id,
      basvuruTarihi: { gte: new Date(Date.now() - 30 * 86400_000) },
    },
  });
  if (mevcut) {
    return NextResponse.json(
      { error: "Bu telefon numarasıyla yakın zamanda başvuru yapılmış." },
      { status: 409 }
    );
  }

  const position = await db.position.findFirst({
    where: { ad: { equals: d.pozisyon } },
  });

  const candidate = await db.candidate.create({
    data: encryptCandidateInput({
      adSoyad: d.adSoyad,
      telefon: d.telefon,
      dogumTarihi: d.dogumTarihi || null,
      cinsiyet: d.cinsiyet || null,
      il: d.il,
      ilce: d.ilce || null,
      positionId: position?.id ?? null,
      projectId: qr.projectId,
      sourceId: qr.sourceId,
      ogrenimDurumu: d.ogrenimDurumu || null,
      askerlikDurumu: d.askerlikDurumu || null,
      engellilikDurumu: d.engellilik === "on" || d.engellilik === true,
      girisYontemi: "qr-form",
      qrCodeId: qr.id,
      kvkkOnay: true,
      kvkkOnayTarihi: new Date(),
    }),
  });

  await audit({
    eylem: "qr-basvuru",
    varlik: "Candidate",
    varlikId: candidate.id,
    detay: { qrKod: qr.kod },
    ip,
  });

  return NextResponse.json({ ok: true });
}
