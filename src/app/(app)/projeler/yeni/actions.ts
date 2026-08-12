"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type FormState = { error?: string } | undefined;

const projeSchema = z.object({
  ad: z.string().trim().min(3, "Proje adı en az 3 karakter olmalı.").max(120),
  kod: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{3,30}$/i, "Proje kodu harf, rakam ve tire içerebilir."),
  bolge: z.string().trim().min(2).max(30),
  kurum: z.string().trim().min(2, "Kurum gerekli.").max(80),
  segment: z.string().trim().min(2, "Segment gerekli.").max(80),
  masrafMerkezi: z.string().trim().max(30).optional().or(z.literal("")),
  il: z.string().trim().min(2, "İl gerekli.").max(40),
  ilce: z.string().trim().min(2, "İlçe gerekli.").max(60),
  ikSorumlusuId: z.string().optional().or(z.literal("")),
  yonetici1: z.string().trim().max(80).optional().or(z.literal("")),
  yonetici2: z.string().trim().max(80).optional().or(z.literal("")),
  yonetici3: z.string().trim().max(80).optional().or(z.literal("")),
});

export async function createProjectAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const user = await requireRole("IK_YONETICISI");

  const raw: Record<string, unknown> = {};
  for (const k of Object.keys(projeSchema.shape)) raw[k] = formData.get(k) ?? "";
  const parsed = projeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const kod = parsed.data.kod.toUpperCase();
  const existing = await db.project.findUnique({ where: { kod } });
  if (existing) return { error: `${kod} kodlu proje zaten mevcut.` };

  const d = parsed.data;
  const project = await db.project.create({
    data: {
      ad: d.ad,
      kod,
      bolge: d.bolge,
      kurum: d.kurum,
      segment: d.segment,
      masrafMerkezi: d.masrafMerkezi || null,
      il: d.il,
      ilce: d.ilce,
      ikSorumlusuId: d.ikSorumlusuId || null,
      yonetici1: d.yonetici1 || null,
      yonetici2: d.yonetici2 || null,
      yonetici3: d.yonetici3 || null,
    },
  });

  const pozisyonId = String(formData.get("pozisyonId") ?? "");
  const normKadro = Number(formData.get("normKadro") ?? 0);
  const aktifKadro = Number(formData.get("aktifKadro") ?? 0);
  if (pozisyonId && Number.isFinite(normKadro) && normKadro > 0) {
    await db.projectPosition.create({
      data: {
        projectId: project.id,
        positionId: pozisyonId,
        tip: "MY",
        normKadro: Math.floor(normKadro),
        aktifKadro: Math.max(0, Math.floor(aktifKadro)),
      },
    });
  }

  await audit({
    userId: user.id,
    eylem: "proje-olustur",
    varlik: "Project",
    varlikId: project.id,
    detay: { kod },
  });
  revalidatePath("/projeler");
  redirect("/projeler");
}
