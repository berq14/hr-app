// Saf kripto yardımcıları — "server-only" içermez ki seed script de kullanabilsin.
// Uygulama kodu bunları src/lib/crypto.ts üzerinden (server-only korumalı) alır.
import crypto from "crypto";

/**
 * Kişisel verilerin (KVKK kapsamındaki alanlar) uygulama katmanında
 * AES-256-GCM ile şifrelenmesi. Veritabanı sızıntısında dahi kişisel
 * veriler anahtar olmadan okunamaz.
 *
 * Format: enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>
 */

const ENC_PREFIX = "enc:";

function getKey(env: string): Buffer {
  const hex = process.env[env];
  if (!hex || hex.length !== 64) {
    throw new Error(`${env} tanımlı değil veya 32 bayt hex değil`);
  }
  return Buffer.from(hex, "hex");
}

export function encryptField(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return null;
  const key = getKey("FIELD_ENCRYPTION_KEY");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptField(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(ENC_PREFIX)) return stored; // eski/şifresiz veri toleransı
  try {
    const [ivHex, tagHex, ctHex] = stored.slice(ENC_PREFIX.length).split(":");
    const key = getKey("FIELD_ENCRYPTION_KEY");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctHex, "hex")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  } catch {
    return null; // bütünlük doğrulaması başarısız — veri kurcalanmış
  }
}

/** Aranabilir alanlar için deterministik HMAC dizini (ör. telefon eşleşmesi). */
export function hmacIndex(value: string): string {
  const key = getKey("INDEX_HMAC_KEY");
  return crypto
    .createHmac("sha256", key)
    .update(value.trim().toLowerCase())
    .digest("hex");
}

/** Oturum ve API anahtarı token'ları düz saklanmaz — SHA-256 özeti saklanır. */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** Zamanlama saldırılarına dayanıklı karşılaştırma. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
