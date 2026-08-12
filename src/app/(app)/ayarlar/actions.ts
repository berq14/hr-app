"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  hashPassword,
  requireRole,
  validatePasswordPolicy,
} from "@/lib/auth";
import { randomToken, sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export type FormState = { error?: string; ok?: string } | undefined;

// ─── Kullanıcı yönetimi ────────────────────────────────────────────

const userSchema = z.object({
  name: z.string().trim().min(3, "Ad Soyad en az 3 karakter olmalı.").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin."),
  role: z.enum(["SISTEM_YONETICISI", "IK_YONETICISI", "IK_UZMANI", "IK_ASISTANI"]),
  password: z.string().min(1, "Geçici şifre gerekli.").max(200),
});

export async function createUserAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireRole("IK_YONETICISI");
  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // yalnızca sistem yöneticisi başka yönetici oluşturabilir
  if (
    parsed.data.role === "SISTEM_YONETICISI" &&
    admin.role !== "SISTEM_YONETICISI"
  ) {
    return { error: "Sistem yöneticisi hesabını yalnızca sistem yöneticisi oluşturabilir." };
  }

  const policyError = validatePasswordPolicy(parsed.data.password);
  if (policyError) return { error: policyError };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "Bu e-posta ile kayıtlı kullanıcı zaten var." };

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password),
    },
  });
  await audit({
    userId: admin.id,
    eylem: "kullanici-olustur",
    varlik: "User",
    varlikId: user.id,
    detay: { email: user.email, role: user.role },
  });
  revalidatePath("/ayarlar");
  return { ok: `${user.name} eklendi. İlk girişte 2FA kurulumu zorunlu olacak.` };
}

export async function toggleUserAction(userId: string): Promise<void> {
  const admin = await requireRole("IK_YONETICISI");
  if (userId === admin.id) return; // kendi hesabını pasifleştiremez
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });
  if (user.isActive) {
    // pasifleştirilen kullanıcının tüm oturumlarını kapat
    await db.session.deleteMany({ where: { userId } });
  }
  await audit({
    userId: admin.id,
    eylem: user.isActive ? "kullanici-pasif" : "kullanici-aktif",
    varlik: "User",
    varlikId: userId,
  });
  revalidatePath("/ayarlar");
}

// ─── Pozisyon / Kaynak ─────────────────────────────────────────────

export async function createPositionAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole("IK_UZMANI");
  const ad = String(formData.get("ad") ?? "").trim();
  if (ad.length < 2 || ad.length > 80) return { error: "Pozisyon adı 2-80 karakter olmalı." };
  const existing = await db.position.findUnique({ where: { ad } });
  if (existing) return { error: "Bu pozisyon zaten tanımlı." };
  await db.position.create({ data: { ad } });
  await audit({ userId: user.id, eylem: "pozisyon-olustur", varlik: "Position", detay: { ad } });
  revalidatePath("/ayarlar");
  return { ok: `"${ad}" pozisyonu eklendi.` };
}

export async function createSourceAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole("IK_UZMANI");
  const ad = String(formData.get("ad") ?? "").trim();
  const maliyet = Number(formData.get("maliyet") ?? 0);
  if (ad.length < 2 || ad.length > 80) return { error: "Kaynak adı 2-80 karakter olmalı." };
  if (!Number.isFinite(maliyet) || maliyet < 0 || maliyet > 10000) {
    return { error: "Maliyet 0-10.000 ₺ aralığında olmalı." };
  }
  const existing = await db.source.findUnique({ where: { ad } });
  if (existing) return { error: "Bu kaynak zaten tanımlı." };
  await db.source.create({ data: { ad, maliyet } });
  await audit({ userId: user.id, eylem: "kaynak-olustur", varlik: "Source", detay: { ad } });
  revalidatePath("/ayarlar");
  return { ok: `"${ad}" kaynağı eklendi.` };
}

// ─── API anahtarları ───────────────────────────────────────────────

export async function createApiKeyAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await requireRole("SISTEM_YONETICISI");
  const ad = String(formData.get("ad") ?? "").trim();
  if (ad.length < 3 || ad.length > 60) return { error: "Anahtar adı 3-60 karakter olmalı." };

  const token = `luna_ing_${randomToken(24)}`;
  await db.apiKey.create({
    data: {
      ad,
      keyHash: sha256(token),
      prefix: token.slice(0, 12),
      scopes: "ingest",
    },
  });
  await audit({ userId: admin.id, eylem: "api-anahtari-olustur", varlik: "ApiKey", detay: { ad } });
  revalidatePath("/ayarlar");
  // anahtar YALNIZCA bu yanıtta bir kez gösterilir
  return { ok: `Anahtar oluşturuldu. Kaydedin, tekrar gösterilmeyecek: ${token}` };
}

export async function toggleApiKeyAction(id: string): Promise<void> {
  const admin = await requireRole("SISTEM_YONETICISI");
  const key = await db.apiKey.findUnique({ where: { id } });
  if (!key) return;
  await db.apiKey.update({ where: { id }, data: { aktif: !key.aktif } });
  await audit({
    userId: admin.id,
    eylem: key.aktif ? "api-anahtari-pasif" : "api-anahtari-aktif",
    varlik: "ApiKey",
    varlikId: id,
  });
  revalidatePath("/ayarlar");
}
