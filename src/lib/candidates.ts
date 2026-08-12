import "server-only";
import type { Candidate } from "@prisma/client";
import { decryptField, encryptField, hmacIndex } from "./crypto";
import { normalizePhone } from "./domain";

/**
 * Aday kişisel verilerinin şifreli saklanması için dönüşüm katmanı.
 * Şifreli alanlar: dogumTarihi, telefon, email, adres, notlar.
 * Aranabilirlik: adSoyadIndex (normalize düz metin), telefonIndex (HMAC).
 */

export type CandidatePlain = Candidate; // alanlar çözülmüş halde aynı tip

export function encryptCandidateInput<T extends Record<string, unknown>>(
  data: T
): T & { adSoyadIndex: string; telefonIndex?: string | null } {
  const out: Record<string, unknown> = { ...data };
  if (typeof out.adSoyad === "string") {
    out.adSoyadIndex = (out.adSoyad as string).toLocaleLowerCase("tr-TR").trim();
  }
  if ("dogumTarihi" in out && typeof out.dogumTarihi === "string") {
    out.dogumTarihi = encryptField(out.dogumTarihi as string);
  }
  if ("telefon" in out && typeof out.telefon === "string" && out.telefon) {
    const normalized = normalizePhone(out.telefon as string);
    out.telefon = encryptField(normalized);
    out.telefonIndex = hmacIndex(normalized);
  }
  if ("email" in out && typeof out.email === "string") {
    out.email = encryptField((out.email as string).trim().toLowerCase());
  }
  if ("adres" in out && typeof out.adres === "string") {
    out.adres = encryptField(out.adres as string);
  }
  if ("notlar" in out && typeof out.notlar === "string") {
    out.notlar = encryptField(out.notlar as string);
  }
  return out as T & { adSoyadIndex: string; telefonIndex?: string | null };
}

export function decryptCandidate<T extends Partial<Candidate>>(c: T): T {
  const out = { ...c };
  if ("dogumTarihi" in out) out.dogumTarihi = decryptField(out.dogumTarihi as string | null);
  if ("telefon" in out) out.telefon = decryptField(out.telefon as string | null);
  if ("email" in out) out.email = decryptField(out.email as string | null);
  if ("adres" in out) out.adres = decryptField(out.adres as string | null);
  if ("notlar" in out) out.notlar = decryptField(out.notlar as string | null);
  return out;
}
