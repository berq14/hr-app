"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getClientIp, requireUser } from "@/lib/auth";
import { encryptCandidateInput } from "@/lib/candidates";
import { audit } from "@/lib/audit";
import { isValidTrPhone } from "@/lib/domain";

export type FormState = { error?: string } | undefined;

const adaySchema = z.object({
  adSoyad: z.string().trim().min(3, "Ad Soyad en az 3 karakter olmalı.").max(120),
  dogumTarihi: z
    .string()
    .trim()
    .regex(/^\d{2}\.\d{2}\.\d{4}$/, "Doğum tarihi GG.AA.YYYY biçiminde olmalı.")
    .optional()
    .or(z.literal("")),
  cinsiyet: z.enum(["Erkek", "Kadın", "Belirtilmemiş"]).optional().or(z.literal("")),
  telefon: z
    .string()
    .trim()
    .refine((v) => !v || isValidTrPhone(v), "Geçerli bir cep telefonu girin (05xx...).")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Geçerli bir e-posta girin.").optional().or(z.literal("")),
  il: z.string().trim().max(40).optional().or(z.literal("")),
  ilce: z.string().trim().max(60).optional().or(z.literal("")),
  positionId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  sourceId: z.string().optional().or(z.literal("")),
  ogrenimDurumu: z.string().max(30).optional().or(z.literal("")),
  askerlikDurumu: z.string().max(20).optional().or(z.literal("")),
  engellilikDurumu: z.coerce.boolean().optional(),
  emeklilikDurumu: z.coerce.boolean().optional(),
  durum: z.enum(["OLUMLU", "OLUMSUZ", "BEKLEMEDE", "ULASILAMADI"]).default("BEKLEMEDE"),
  onMulakatSonucu: z.string().max(20).optional().or(z.literal("")),
  notlar: z.string().max(2000).optional().or(z.literal("")),
});

function parseForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const k of [
    "adSoyad", "dogumTarihi", "cinsiyet", "telefon", "email", "il", "ilce",
    "positionId", "projectId", "sourceId", "ogrenimDurumu", "askerlikDurumu",
    "durum", "onMulakatSonucu", "notlar",
  ]) {
    raw[k] = formData.get(k) ?? "";
  }
  raw.engellilikDurumu = formData.get("engellilikDurumu") === "on";
  raw.emeklilikDurumu = formData.get("emeklilikDurumu") === "on";
  return adaySchema.safeParse(raw);
}

function toData(d: z.infer<typeof adaySchema>) {
  const nn = (v: string | undefined) => (v ? v : null);
  return encryptCandidateInput({
    adSoyad: d.adSoyad,
    dogumTarihi: nn(d.dogumTarihi),
    cinsiyet: nn(d.cinsiyet),
    telefon: nn(d.telefon),
    email: nn(d.email),
    il: nn(d.il),
    ilce: nn(d.ilce),
    positionId: nn(d.positionId),
    projectId: nn(d.projectId),
    sourceId: nn(d.sourceId),
    ogrenimDurumu: nn(d.ogrenimDurumu),
    askerlikDurumu: nn(d.askerlikDurumu),
    engellilikDurumu: d.engellilikDurumu ?? false,
    emeklilikDurumu: d.emeklilikDurumu ?? false,
    durum: d.durum,
    onMulakatSonucu: nn(d.onMulakatSonucu),
    notlar: nn(d.notlar),
  });
}

export async function createCandidateAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const candidate = await db.candidate.create({
    data: {
      ...toData(parsed.data),
      girisYontemi: "manuel",
      uploadedById: user.id,
      kvkkOnay: formData.get("kvkkOnay") === "on",
      kvkkOnayTarihi: formData.get("kvkkOnay") === "on" ? new Date() : null,
    },
  });
  const h = await headers();
  await audit({
    userId: user.id,
    eylem: "aday-olustur",
    varlik: "Candidate",
    varlikId: candidate.id,
    ip: getClientIp(h),
  });
  revalidatePath("/adaylar");
  redirect(`/adaylar/${candidate.id}`);
}

export async function updateCandidateAction(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await db.candidate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { error: "Aday bulunamadı." };

  await db.candidate.update({
    where: { id },
    data: {
      ...toData(parsed.data),
      onMulakatTarihi:
        parsed.data.onMulakatSonucu && parsed.data.onMulakatSonucu !== ""
          ? new Date()
          : undefined,
    },
  });
  const h = await headers();
  await audit({
    userId: user.id,
    eylem: "aday-guncelle",
    varlik: "Candidate",
    varlikId: id,
    ip: getClientIp(h),
  });
  revalidatePath("/adaylar");
  revalidatePath(`/adaylar/${id}`);
  redirect(`/adaylar/${id}`);
}
