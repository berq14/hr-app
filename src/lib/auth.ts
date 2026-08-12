import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import argon2 from "argon2";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { decryptField, encryptField, randomToken, sha256 } from "./crypto";
import { audit } from "./audit";

import { SESSION_COOKIE } from "./auth-constants";

export { SESSION_COOKIE };
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 saat
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

// ─── Şifre ─────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB (OWASP önerisi)
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Şifre politikası: en az 10 karakter, harf + rakam zorunlu. */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 10) return "Şifre en az 10 karakter olmalıdır.";
  if (!/[a-zA-ZğüşöçıİĞÜŞÖÇ]/.test(password)) return "Şifre harf içermelidir.";
  if (!/[0-9]/.test(password)) return "Şifre rakam içermelidir.";
  return null;
}

// ─── TOTP (2FA) ────────────────────────────────────────────────────
// bkz. src/lib/totp.ts (RFC 6238 uygulaması)
export { generateTotpSecret, totpKeyUri, verifyTotp } from "./totp";

// ─── Oturum ────────────────────────────────────────────────────────

export async function createSession(userId: string, twoFaOk: boolean) {
  const token = randomToken(32);
  const h = await headers();
  await db.session.create({
    data: {
      tokenHash: sha256(token),
      userId,
      twoFaOk,
      ip: getClientIp(h),
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

export type SessionUser = Pick<
  User,
  "id" | "email" | "name" | "role" | "totpEnabled" | "isActive"
> & { twoFaOk: boolean };

/** Geçerli oturumu döndürür (2FA tamamlanmamış olabilir). React cache ile istek başına tek sorgu. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;
  const { id, email, name, role, totpEnabled, isActive } = session.user;
  return { id, email, name, role, totpEnabled, isActive, twoFaOk: session.twoFaOk };
});

/** Tam doğrulanmış (2FA dahil) kullanıcı ister; yoksa girişe yönlendirir. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/giris");
  if (!user.twoFaOk) redirect(user.totpEnabled ? "/giris/dogrulama" : "/giris/2fa-kurulum");
  return user;
}

const ROLE_LEVEL: Record<Role, number> = {
  IK_ASISTANI: 1,
  IK_UZMANI: 2,
  IK_YONETICISI: 3,
  SISTEM_YONETICISI: 4,
};

export async function requireRole(minRole: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) redirect("/");
  return user;
}

export function hasRole(user: { role: Role }, minRole: Role): boolean {
  return ROLE_LEVEL[user.role] >= ROLE_LEVEL[minRole];
}

// ─── Giriş akışı ───────────────────────────────────────────────────

export async function attemptLogin(email: string, password: string, ip: string | null) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });

  // kullanıcı yoksa da sahte doğrulama yap — zamanlama ile kullanıcı keşfini önler
  if (!user) {
    await argon2
      .verify(
        "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        password
      )
      .catch(() => {});
    return { ok: false as const, error: "E-posta veya şifre hatalı." };
  }

  if (!user.isActive) return { ok: false as const, error: "Hesabınız pasif durumda." };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const dk = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      ok: false as const,
      error: `Çok fazla hatalı deneme. Hesap ${dk} dakika kilitli.`,
    };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    const failed = user.failedLogins + 1;
    await db.user.update({
      where: { id: user.id },
      data: {
        failedLogins: failed,
        lockedUntil:
          failed >= MAX_FAILED_LOGINS
            ? new Date(Date.now() + LOCK_MINUTES * 60000)
            : null,
      },
    });
    await audit({ userId: user.id, eylem: "giris-basarisiz", ip });
    return { ok: false as const, error: "E-posta veya şifre hatalı." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await audit({ userId: user.id, eylem: "giris", ip });
  return { ok: true as const, user };
}

// ─── Yardımcılar ───────────────────────────────────────────────────

export function getClientIp(h: Headers): string | null {
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

export function getUserTotpSecret(user: { totpSecret: string | null }): string | null {
  return decryptField(user.totpSecret);
}

export function encryptTotpSecret(secret: string): string {
  return encryptField(secret)!;
}
