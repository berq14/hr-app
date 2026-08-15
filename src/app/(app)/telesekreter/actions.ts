"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { runCampaignTick } from "@/lib/ivr/engine";

export type FormState = { error?: string; ok?: string } | undefined;

const settingsSchema = z.object({
  aktif: z.boolean(),
  saat1: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat HH:mm biçiminde olmalı."),
  saat2: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat HH:mm biçiminde olmalı."),
  maxDeneme: z.coerce.number().int().min(1).max(10),
  olumluEsigi: z.coerce.number().int().min(1).max(100),
});

export async function saveIvrSettingsAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole("IK_UZMANI");
  const parsed = settingsSchema.safeParse({
    aktif: formData.get("aktif") === "on",
    saat1: formData.get("saat1"),
    saat2: formData.get("saat2"),
    maxDeneme: formData.get("maxDeneme"),
    olumluEsigi: formData.get("olumluEsigi"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data.saat1 === parsed.data.saat2) {
    return { error: "İki arama saati aynı olamaz." };
  }
  await db.ivrSettings.upsert({
    where: { id: "main" },
    create: { id: "main", ...parsed.data },
    update: parsed.data,
  });
  await audit({ userId: user.id, eylem: "ivr-ayar-guncelle", detay: parsed.data });
  revalidatePath("/telesekreter");
  return { ok: "Kampanya ayarları kaydedildi." };
}

const questionSchema = z.object({
  metin: z.string().trim().min(10, "Soru en az 10 karakter olmalı.").max(400),
  olumluTus: z.enum(["1", "2"]),
  eleyici: z.boolean(),
});

export async function addQuestionAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole("IK_UZMANI");
  const parsed = questionSchema.safeParse({
    metin: formData.get("metin"),
    olumluTus: formData.get("olumluTus"),
    eleyici: formData.get("eleyici") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const maxSira = await db.ivrQuestion.aggregate({ _max: { sira: true } });
  await db.ivrQuestion.create({
    data: { ...parsed.data, sira: (maxSira._max.sira ?? 0) + 1 },
  });
  await audit({ userId: user.id, eylem: "ivr-soru-ekle", detay: { metin: parsed.data.metin } });
  revalidatePath("/telesekreter");
  return { ok: "Soru eklendi." };
}

export async function deleteQuestionAction(id: string): Promise<void> {
  const user = await requireRole("IK_UZMANI");
  await db.ivrQuestion.delete({ where: { id } }).catch(() => {});
  await audit({ userId: user.id, eylem: "ivr-soru-sil", varlikId: id });
  revalidatePath("/telesekreter");
}

export async function toggleQuestionAction(id: string): Promise<void> {
  await requireRole("IK_UZMANI");
  const q = await db.ivrQuestion.findUnique({ where: { id } });
  if (!q) return;
  await db.ivrQuestion.update({ where: { id }, data: { aktif: !q.aktif } });
  revalidatePath("/telesekreter");
}

export async function moveQuestionAction(id: string, yon: "yukari" | "asagi"): Promise<void> {
  await requireRole("IK_UZMANI");
  const all = await db.ivrQuestion.findMany({ orderBy: { sira: "asc" } });
  const i = all.findIndex((q) => q.id === id);
  const j = yon === "yukari" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  await db.$transaction([
    db.ivrQuestion.update({ where: { id: all[i].id }, data: { sira: all[j].sira } }),
    db.ivrQuestion.update({ where: { id: all[j].id }, data: { sira: all[i].sira } }),
  ]);
  revalidatePath("/telesekreter");
}

export type TickResult =
  | { ok: true; yeniGorev: number; aranan: number; ulasilan: number; ulasilamayan: number; kapatilan: number }
  | { ok: false; error: string };

/** "Bu turu şimdi çalıştır" — simülatörle kampanya turu koşar. */
export async function runNowAction(): Promise<TickResult> {
  const user = await requireRole("IK_UZMANI");
  const r = await runCampaignTick("manuel", user.id);
  revalidatePath("/telesekreter");
  if (!r.ok) return { ok: false, error: r.error };
  return r;
}
