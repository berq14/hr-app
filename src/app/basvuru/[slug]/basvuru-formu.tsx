"use client";

import { useState } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import {
  ASKERLIK_DURUMLARI,
  CINSIYETLER,
  OGRENIM_DURUMLARI,
} from "@/lib/domain";

export function BasvuruFormu({
  slug,
  pozisyonlar,
}: {
  slug: string;
  pozisyonlar: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/basvuru", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, slug, kvkkOnay: fd.get("kvkkOnay") === "on" }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Başvuru gönderilemedi.");
      else setDone(true);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CircleCheck className="h-14 w-14 text-emerald-500" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold">Başvurunuz Alındı</h2>
        <p className="max-w-sm text-sm text-slate-600">
          Başvurunuz başarıyla kaydedildi. Değerlendirme sonrasında insan
          kaynakları ekibimiz sizinle telefonla iletişime geçecektir.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Ad Soyad *">
          <input name="adSoyad" required minLength={3} maxLength={120} className={inputCls} placeholder="Adınız Soyadınız" autoComplete="name" />
        </Field>
        <Field label="Cep Telefonu *">
          <input name="telefon" required className={inputCls} placeholder="05xx xxx xx xx" inputMode="tel" autoComplete="tel" />
        </Field>
        <Field label="Doğum Tarihi" hint="GG.AA.YYYY">
          <input name="dogumTarihi" className={inputCls} placeholder="15.05.1990" />
        </Field>
        <Field label="Cinsiyet">
          <select name="cinsiyet" className={inputCls} defaultValue="">
            <option value="">Belirtmek istemiyorum</option>
            {CINSIYETLER.filter((c) => c !== "Belirtilmemiş").map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="İl *">
          <input name="il" required maxLength={40} className={inputCls} placeholder="İstanbul" />
        </Field>
        <Field label="İlçe">
          <input name="ilce" maxLength={60} className={inputCls} placeholder="Pendik" />
        </Field>
        <Field label="Başvurmak İstediğiniz Pozisyon *">
          <select name="pozisyon" required className={inputCls} defaultValue={pozisyonlar.length === 1 ? pozisyonlar[0] : ""}>
            {pozisyonlar.length > 1 ? <option value="">Seçiniz</option> : null}
            {pozisyonlar.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Öğrenim Durumu">
          <select name="ogrenimDurumu" className={inputCls} defaultValue="">
            <option value="">Seçiniz</option>
            {OGRENIM_DURUMLARI.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Askerlik Durumu">
          <select name="askerlikDurumu" className={inputCls} defaultValue="">
            <option value="">Seçiniz</option>
            {ASKERLIK_DURUMLARI.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-5 pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="engellilik" className="h-4 w-4 accent-blue-600" />
            Engellilik durumum var
          </label>
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5 text-[13px] leading-relaxed text-slate-600">
        <input type="checkbox" name="kvkkOnay" required className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600" />
        <span>
          Kişisel verilerimin, 6698 sayılı KVKK kapsamında işe alım süreçlerinin
          yürütülmesi amacıyla işlenmesine açık rıza veriyorum. *
        </span>
      </label>

      {error ? (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className={btnPrimary + " w-full"}>
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Başvuruyu Gönder
      </button>
    </form>
  );
}
