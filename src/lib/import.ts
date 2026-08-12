import "server-only";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { z } from "zod";
import { db } from "./db";
import { encryptCandidateInput } from "./candidates";
import { hmacIndex } from "./crypto";
import { isValidTrPhone, normalizePhone } from "./domain";

/**
 * Toplu aday aktarımı: xlsx / csv / json.
 * Satır bazında doğrulama yapılır; hatalı satırlar rapora yazılır,
 * geçerli satırlar aktarılır. Mükerrer kontrolü telefon HMAC dizini ile yapılır.
 */

export const MAX_IMPORT_ROWS = 5000;
export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

const rowSchema = z.object({
  adSoyad: z.string().trim().min(3, "Ad Soyad en az 3 karakter olmalı").max(120),
  telefon: z
    .string()
    .trim()
    .refine((v) => !v || isValidTrPhone(v), "Telefon numarası geçersiz")
    .optional()
    .default(""),
  dogumTarihi: z.string().trim().optional().default(""),
  cinsiyet: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  il: z.string().trim().max(40).optional().default(""),
  ilce: z.string().trim().max(60).optional().default(""),
  pozisyon: z.string().trim().max(80).optional().default(""),
  kaynak: z.string().trim().max(80).optional().default(""),
  proje: z.string().trim().max(120).optional().default(""),
  ogrenimDurumu: z.string().trim().max(30).optional().default(""),
  askerlikDurumu: z.string().trim().max(20).optional().default(""),
  engellilik: z.string().trim().optional().default(""),
  emeklilik: z.string().trim().optional().default(""),
  notlar: z.string().trim().max(2000).optional().default(""),
});

export type ImportRow = z.infer<typeof rowSchema>;

// Türkçe sütun başlığı → alan eşlemesi
const HEADER_MAP: Record<string, keyof ImportRow> = {
  "ad soyad": "adSoyad",
  "adsoyad": "adSoyad",
  "ad-soyad": "adSoyad",
  "isim": "adSoyad",
  "ad": "adSoyad",
  "telefon": "telefon",
  "tel": "telefon",
  "tel no": "telefon",
  "gsm": "telefon",
  "cep": "telefon",
  "doğum tarihi": "dogumTarihi",
  "dogum tarihi": "dogumTarihi",
  "cinsiyet": "cinsiyet",
  "e-posta": "email",
  "eposta": "email",
  "email": "email",
  "mail": "email",
  "il": "il",
  "şehir": "il",
  "ilçe": "ilce",
  "ilce": "ilce",
  "pozisyon": "pozisyon",
  "başvurulan pozisyon": "pozisyon",
  "kaynak": "kaynak",
  "başvuru kaynağı": "kaynak",
  "proje": "proje",
  "öğrenim durumu": "ogrenimDurumu",
  "ogrenim durumu": "ogrenimDurumu",
  "eğitim": "ogrenimDurumu",
  "askerlik": "askerlikDurumu",
  "askerlik durumu": "askerlikDurumu",
  "engellilik": "engellilik",
  "engellilik durumu": "engellilik",
  "emeklilik": "emeklilik",
  "emeklilik durumu": "emeklilik",
  "not": "notlar",
  "notlar": "notlar",
  "açıklama": "notlar",
};

function mapHeaders(raw: Record<string, unknown>): Partial<ImportRow> {
  const out: Partial<Record<keyof ImportRow, string>> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = HEADER_MAP[k.trim().toLocaleLowerCase("tr-TR")];
    if (key && v !== null && v !== undefined) out[key] = String(v).trim();
  }
  return out;
}

export async function parseFile(
  filename: string,
  buffer: Buffer
): Promise<Record<string, unknown>[]> {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls") {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const ws = wb.worksheets[0];
    if (!ws) return [];
    const headers: string[] = [];
    ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
      headers[col] = String(cell.value ?? "").trim();
    });
    const rows: Record<string, unknown>[] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const obj: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        if (!headers[col]) return;
        let v = cell.value;
        if (v && typeof v === "object" && "text" in v) v = (v as { text: string }).text;
        if (v instanceof Date) v = v.toLocaleDateString("tr-TR");
        obj[headers[col]] = v == null ? "" : String(v);
      });
      rows.push(obj);
    });
    return rows;
  }
  if (ext === "csv" || ext === "txt") {
    const text = buffer.toString("utf8").replace(/^﻿/, "");
    const res = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      delimitersToGuess: [",", ";", "\t"],
    });
    return res.data;
  }
  if (ext === "json") {
    const parsed = JSON.parse(buffer.toString("utf8"));
    const arr = Array.isArray(parsed) ? parsed : parsed?.kayitlar ?? parsed?.data;
    if (!Array.isArray(arr)) throw new Error("JSON bir kayıt dizisi içermeli.");
    return arr as Record<string, unknown>[];
  }
  throw new Error("Desteklenmeyen dosya türü. xlsx, csv veya json yükleyin.");
}

export async function runImport(params: {
  filename: string;
  tip: string;
  rawRows: Record<string, unknown>[];
  userId: string;
  girisYontemi?: string;
}) {
  const { rawRows } = params;
  if (rawRows.length === 0) throw new Error("Dosyada kayıt bulunamadı.");
  if (rawRows.length > MAX_IMPORT_ROWS) {
    throw new Error(`En fazla ${MAX_IMPORT_ROWS} satır aktarılabilir.`);
  }

  const [positions, sources, projects] = await Promise.all([
    db.position.findMany(),
    db.source.findMany(),
    db.project.findMany(),
  ]);
  const bul = <T extends { id: string }>(list: T[], f: (x: T) => string, v?: string) =>
    v ? list.find((x) => f(x).toLocaleLowerCase("tr-TR") === v.toLocaleLowerCase("tr-TR"))?.id ?? null : null;

  // son 30 gün mükerrer kontrolü için mevcut telefon dizinleri
  const son30 = new Date(Date.now() - 30 * 86400_000);
  const mevcut = await db.candidate.findMany({
    where: { basvuruTarihi: { gte: son30 }, telefonIndex: { not: null } },
    select: { telefonIndex: true },
  });
  const gorulen = new Set(mevcut.map((m) => m.telefonIndex));

  const hatalar: { satir: number; hata: string }[] = [];
  const kayitlar = [];
  const evet = (v: string | undefined) =>
    !!v && ["evet", "var", "true", "1"].includes(v.toLocaleLowerCase("tr-TR"));

  for (let i = 0; i < rawRows.length; i++) {
    const satirNo = i + 2; // başlık satırı + 1-indeks
    const mapped = mapHeaders(rawRows[i]);
    const parsed = rowSchema.safeParse(mapped);
    if (!parsed.success) {
      hatalar.push({ satir: satirNo, hata: parsed.error.issues[0].message });
      continue;
    }
    const d = parsed.data;
    if (d.telefon) {
      const idx = hmacIndex(normalizePhone(d.telefon));
      if (gorulen.has(idx)) {
        hatalar.push({ satir: satirNo, hata: "Mükerrer kayıt (aynı telefon, son 30 gün)" });
        continue;
      }
      gorulen.add(idx);
    }
    kayitlar.push(
      encryptCandidateInput({
        adSoyad: d.adSoyad,
        telefon: d.telefon || null,
        dogumTarihi: d.dogumTarihi || null,
        cinsiyet: ["Erkek", "Kadın"].includes(d.cinsiyet) ? d.cinsiyet : null,
        email: d.email || null,
        il: d.il || null,
        ilce: d.ilce || null,
        positionId: bul(positions, (x) => x.ad, d.pozisyon),
        sourceId: bul(sources, (x) => x.ad, d.kaynak),
        projectId: bul(projects, (x) => x.ad, d.proje),
        ogrenimDurumu: d.ogrenimDurumu || null,
        askerlikDurumu: d.askerlikDurumu || null,
        engellilikDurumu: evet(d.engellilik),
        emeklilikDurumu: evet(d.emeklilik),
        notlar: d.notlar || null,
        girisYontemi: params.girisYontemi ?? "import",
        uploadedById: params.userId,
        kvkkOnay: true,
        kvkkOnayTarihi: new Date(),
      })
    );
  }

  const batch = await db.importBatch.create({
    data: {
      dosyaAdi: params.filename,
      tip: params.tip,
      toplamKayit: rawRows.length,
      basarili: kayitlar.length,
      hatali: hatalar.length,
      hatalar: hatalar.length ? JSON.stringify(hatalar.slice(0, 500)) : null,
      durum: "tamamlandi",
      createdById: params.userId,
    },
  });

  for (let i = 0; i < kayitlar.length; i += 100) {
    await db.candidate.createMany({
      data: kayitlar.slice(i, i + 100).map((k) => ({ ...k, importBatchId: batch.id })),
    });
  }

  return { batchId: batch.id, toplam: rawRows.length, basarili: kayitlar.length, hatalar };
}
