import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { encryptCandidateInput } from "@/lib/candidates";
import { encryptField, hmacIndex } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { isValidTrPhone, normalizePhone } from "@/lib/domain";

/**
 * Telesekreter robotu için makine-makine veri alım ucu.
 * Kimlik doğrulama: "Authorization: Bearer <api-anahtarı>" — anahtarların
 * yalnızca SHA-256 özeti saklanır.
 *
 * Gönderim biçimi:
 * { "kayitlar": [ { adSoyad, telefon, pozisyon?, kaynak?, il?, ilce?,
 *   arama?: { tarih, kacinciArama, sonuc, gorusmeSuresiSn?, smsDurumu?, not? } } ] }
 */

export const dynamic = "force-dynamic";

const aramaSchema = z.object({
  tarih: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  kacinciArama: z.number().int().min(1).max(50).default(1),
  sonuc: z.enum(["Olumlu", "Olumsuz", "Beklemede", "Ulaşılamadı", "Hatalı Numara"]),
  gorusmeSuresiSn: z.number().int().min(0).max(7200).optional(),
  smsDurumu: z.enum(["Gönderildi", "Gönderilemedi"]).optional(),
  not: z.string().max(1000).optional(),
});

const kayitSchema = z.object({
  adSoyad: z.string().trim().min(3).max(120),
  telefon: z.string().trim().refine(isValidTrPhone, "Telefon geçersiz"),
  pozisyon: z.string().trim().max(80).optional(),
  kaynak: z.string().trim().max(80).optional(),
  il: z.string().trim().max(40).optional(),
  ilce: z.string().trim().max(60).optional(),
  arama: aramaSchema.optional(),
});

const bodySchema = z.object({
  kayitlar: z.array(kayitSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  // API anahtarı doğrulama
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "API anahtarı gerekli." }, { status: 401 });
  }
  const apiKey = await db.apiKey.findUnique({ where: { keyHash: sha256(token) } });
  if (!apiKey || !apiKey.aktif || !apiKey.scopes.includes("ingest")) {
    return NextResponse.json({ error: "Geçersiz API anahtarı." }, { status: 401 });
  }

  const rl = rateLimit(`ingest:${apiKey.id}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Hız sınırı aşıldı.", retryAfterSn: rl.retryAfterSn },
      { status: 429 }
    );
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
      { error: "Doğrulama hatası", detay: parsed.error.issues.slice(0, 5) },
      { status: 422 }
    );
  }

  const [positions, sources] = await Promise.all([
    db.position.findMany(),
    db.source.findMany(),
  ]);
  const bul = <T extends { id: string; ad: string }>(list: T[], v?: string) =>
    v ? list.find((x) => x.ad.toLocaleLowerCase("tr-TR") === v.toLocaleLowerCase("tr-TR"))?.id ?? null : null;

  let yeniAday = 0;
  let guncellenen = 0;
  let aramaKaydi = 0;

  for (const k of parsed.data.kayitlar) {
    const telIdx = hmacIndex(normalizePhone(k.telefon));
    let aday = await db.candidate.findFirst({
      where: { telefonIndex: telIdx },
      orderBy: { basvuruTarihi: "desc" },
    });

    if (!aday) {
      aday = await db.candidate.create({
        data: encryptCandidateInput({
          adSoyad: k.adSoyad,
          telefon: k.telefon,
          il: k.il ?? null,
          ilce: k.ilce ?? null,
          positionId: bul(positions, k.pozisyon),
          sourceId: bul(sources, k.kaynak),
          girisYontemi: "api",
          kvkkOnay: true,
          kvkkOnayTarihi: new Date(),
        }),
      });
      yeniAday++;
    }

    if (k.arama) {
      await db.callRecord.create({
        data: {
          candidateId: aday.id,
          aramaTarihi: new Date(k.arama.tarih),
          kacinciArama: k.arama.kacinciArama,
          sonuc: k.arama.sonuc,
          gorusmeSuresiSn: k.arama.gorusmeSuresiSn ?? null,
          smsDurumu: k.arama.smsDurumu ?? null,
          notlar: k.arama.not ? encryptField(k.arama.not) : null,
        },
      });
      aramaKaydi++;
      // arama sonucu aday durumuna yansıt
      const durumMap: Record<string, "OLUMLU" | "OLUMSUZ" | "BEKLEMEDE" | "ULASILAMADI"> = {
        Olumlu: "OLUMLU",
        Olumsuz: "OLUMSUZ",
        Beklemede: "BEKLEMEDE",
        Ulaşılamadı: "ULASILAMADI",
        "Hatalı Numara": "ULASILAMADI",
      };
      await db.candidate.update({
        where: { id: aday.id },
        data: {
          durum: durumMap[k.arama.sonuc],
          onMulakatSonucu: ["Olumlu", "Olumsuz", "Beklemede"].includes(k.arama.sonuc)
            ? k.arama.sonuc
            : "Ulaşılamadı",
          onMulakatTarihi: new Date(k.arama.tarih),
        },
      });
      guncellenen++;
    }
  }

  await db.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });
  await audit({
    eylem: "api-ingest",
    varlik: "ApiKey",
    varlikId: apiKey.id,
    detay: { yeniAday, guncellenen, aramaKaydi },
  });

  return NextResponse.json({ ok: true, yeniAday, guncellenen, aramaKaydi });
}
