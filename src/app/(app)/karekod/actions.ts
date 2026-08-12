"use server";

import { z } from "zod";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { randomToken } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export type QrResult =
  | {
      ok: true;
      kod: string;
      slug: string;
      url: string;
      dataUrl: string;
      olusturan: string;
      tarih: string;
    }
  | { ok: false; error: string };

const schema = z.object({
  sourceId: z.string().min(1, "Kaynak seçin."),
  kurum: z.string().trim().min(2, "Kurum bilgisi girin.").max(80),
  pozisyonlar: z.array(z.string().trim().min(1).max(80)).min(1, "En az bir pozisyon seçin.").max(10),
  projectId: z.string().optional().or(z.literal("")),
  cerceve: z.enum(["cerceveli", "cercevesiz", "koseli", "renkli"]),
  renk: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ekBilgi: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createQrAction(input: unknown): Promise<QrResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 12);
  const sira = (await db.qrCode.count()) + 1;
  const kod = `QR-${now.toISOString().slice(0, 10)}-${stamp.slice(8, 12)}-${String(sira).padStart(3, "0")}`;
  const slug = randomToken(9);

  await db.qrCode.create({
    data: {
      kod,
      slug,
      sourceId: d.sourceId,
      kurum: d.kurum,
      pozisyonlar: JSON.stringify(d.pozisyonlar),
      projectId: d.projectId || null,
      cerceve: d.cerceve,
      renk: d.renk,
      ekBilgi: d.ekBilgi || null,
      createdById: user.id,
    },
  });

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${base}/basvuru/${slug}`;
  const dataUrl = await QRCode.toDataURL(url, {
    width: 480,
    margin: 1,
    color: { dark: d.cerceve === "renkli" ? "#1e293b" : d.renk, light: "#ffffff" },
  });

  await audit({
    userId: user.id,
    eylem: "karekod-olustur",
    varlik: "QrCode",
    detay: { kod, kurum: d.kurum },
  });

  return {
    ok: true,
    kod,
    slug,
    url,
    dataUrl,
    olusturan: user.name,
    tarih: now.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
