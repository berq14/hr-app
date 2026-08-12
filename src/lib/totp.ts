import "server-only";
import crypto from "crypto";

/**
 * RFC 4226 (HOTP) + RFC 6238 (TOTP) uygulaması — Google Authenticator uyumlu.
 * Harici bağımlılık yerine Node crypto ile uygulanmıştır (denetlenebilirlik).
 */

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20)); // 160 bit
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", secret).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

/** token'ı ±1 zaman penceresi toleransıyla doğrular. */
export function verifyTotp(secretB32: string, token: string): boolean {
  const clean = token.replace(/\D/g, "");
  if (clean.length !== 6) return false;
  const secret = base32Decode(secretB32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (const w of [0, -1, 1]) {
    const expected = hotp(secret, counter + w);
    if (
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))
    ) {
      return true;
    }
  }
  return false;
}

export function generateTotp(secretB32: string): string {
  return hotp(base32Decode(secretB32), Math.floor(Date.now() / 1000 / 30));
}

export function totpKeyUri(email: string, secretB32: string): string {
  const issuer = encodeURIComponent("Luna İK Platformu");
  return `otpauth://totp/${issuer}:${encodeURIComponent(email)}?secret=${secretB32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}
