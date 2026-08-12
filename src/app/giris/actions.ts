"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  attemptLogin,
  createSession,
  destroySession,
  encryptTotpSecret,
  generateTotpSecret,
  getClientIp,
  getSession,
  getUserTotpSecret,
  verifyTotp,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";

export type FormState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifre gerekli.").max(200),
});

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const h = await headers();
  const ip = getClientIp(h) ?? "local";

  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return { error: `Çok fazla deneme. ${rl.retryAfterSn} saniye sonra tekrar deneyin.` };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const result = await attemptLogin(parsed.data.email, parsed.data.password, ip);
  if (!result.ok) return { error: result.error };

  // Şifre doğru — 2FA henüz doğrulanmadı
  await createSession(result.user.id, false);
  redirect(result.user.totpEnabled ? "/giris/dogrulama" : "/giris/2fa-kurulum");
}

const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "6 haneli kodu girin."),
});

export async function verify2faAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/giris");

  const h = await headers();
  const ip = getClientIp(h) ?? "local";
  const rl = rateLimit(`2fa:${session.id}`, 6, 60_000);
  if (!rl.ok) {
    return { error: `Çok fazla deneme. ${rl.retryAfterSn} saniye sonra tekrar deneyin.` };
  }

  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await db.user.findUnique({ where: { id: session.id } });
  const secret = user ? getUserTotpSecret(user) : null;
  if (!user || !secret) redirect("/giris/2fa-kurulum");

  if (!verifyTotp(secret, parsed.data.code)) {
    await audit({ userId: user.id, eylem: "2fa-basarisiz", ip });
    return { error: "Doğrulama kodu hatalı. Tekrar deneyin." };
  }

  await markSessionTwoFaOk();
  await audit({ userId: user.id, eylem: "2fa-dogrulandi", ip });
  redirect("/");
}

export async function setup2faAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/giris");

  const parsed = totpSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const secret = String(formData.get("secret") ?? "");
  if (!/^[A-Z2-7]{16,64}$/.test(secret)) return { error: "Geçersiz kurulum. Sayfayı yenileyin." };

  if (!verifyTotp(secret, parsed.data.code)) {
    return { error: "Kod doğrulanamadı. Uygulamadaki güncel kodu girin." };
  }

  await db.user.update({
    where: { id: session.id },
    data: { totpSecret: encryptTotpSecret(secret), totpEnabled: true },
  });
  await markSessionTwoFaOk();
  await audit({ userId: session.id, eylem: "2fa-kuruldu" });
  redirect("/");
}

async function markSessionTwoFaOk() {
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get("luna_session")?.value;
  if (!token) return;
  await db.session.updateMany({
    where: { tokenHash: sha256(token) },
    data: { twoFaOk: true },
  });
}

export async function logoutAction() {
  await destroySession();
  redirect("/giris");
}

/** 2FA kurulum sayfası için geçici secret üretir (sunucuda). */
export async function createSetupSecret() {
  return generateTotpSecret();
}
