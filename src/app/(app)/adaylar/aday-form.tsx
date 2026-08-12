"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import {
  ASKERLIK_DURUMLARI,
  CINSIYETLER,
  OGRENIM_DURUMLARI,
  ON_MULAKAT_SONUCLARI,
} from "@/lib/domain";
import type { FormState } from "./actions";

type Opt = { id: string; ad: string };

export type AdayFormValues = Partial<{
  adSoyad: string;
  dogumTarihi: string | null;
  cinsiyet: string | null;
  telefon: string | null;
  email: string | null;
  il: string | null;
  ilce: string | null;
  positionId: string | null;
  projectId: string | null;
  sourceId: string | null;
  ogrenimDurumu: string | null;
  askerlikDurumu: string | null;
  engellilikDurumu: boolean;
  emeklilikDurumu: boolean;
  durum: string;
  onMulakatSonucu: string | null;
  notlar: string | null;
}>;

export function AdayForm({
  action,
  defaults,
  positions,
  projects,
  sources,
  submitLabel,
  kvkkAlani = false,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults?: AdayFormValues;
  positions: Opt[];
  projects: Opt[];
  sources: Opt[];
  submitLabel: string;
  kvkkAlani?: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined
  );
  const d = defaults ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Ad Soyad *">
          <input name="adSoyad" required defaultValue={d.adSoyad ?? ""} className={inputCls} placeholder="Adı Soyadı" />
        </Field>
        <Field label="Doğum Tarihi" hint="GG.AA.YYYY">
          <input name="dogumTarihi" defaultValue={d.dogumTarihi ?? ""} className={inputCls} placeholder="15.05.1990" />
        </Field>
        <Field label="Cinsiyet">
          <select name="cinsiyet" defaultValue={d.cinsiyet ?? ""} className={inputCls}>
            <option value="">Seçiniz</option>
            {CINSIYETLER.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Telefon">
          <input name="telefon" defaultValue={d.telefon ?? ""} className={inputCls} placeholder="0532 123 45 67" inputMode="tel" />
        </Field>
        <Field label="E-posta">
          <input name="email" type="email" defaultValue={d.email ?? ""} className={inputCls} placeholder="ornek@eposta.com" />
        </Field>
        <Field label="İl">
          <input name="il" defaultValue={d.il ?? ""} className={inputCls} placeholder="İstanbul" />
        </Field>
        <Field label="İlçe">
          <input name="ilce" defaultValue={d.ilce ?? ""} className={inputCls} placeholder="Pendik" />
        </Field>
        <Field label="Başvurulan Pozisyon">
          <select name="positionId" defaultValue={d.positionId ?? ""} className={inputCls}>
            <option value="">Seçiniz</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.ad}</option>
            ))}
          </select>
        </Field>
        <Field label="Proje">
          <select name="projectId" defaultValue={d.projectId ?? ""} className={inputCls}>
            <option value="">Seçiniz</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.ad}</option>
            ))}
          </select>
        </Field>
        <Field label="Başvuru Kaynağı">
          <select name="sourceId" defaultValue={d.sourceId ?? ""} className={inputCls}>
            <option value="">Seçiniz</option>
            {sources.map((p) => (
              <option key={p.id} value={p.id}>{p.ad}</option>
            ))}
          </select>
        </Field>
        <Field label="Öğrenim Durumu">
          <select name="ogrenimDurumu" defaultValue={d.ogrenimDurumu ?? ""} className={inputCls}>
            <option value="">Seçiniz</option>
            {OGRENIM_DURUMLARI.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Askerlik Durumu">
          <select name="askerlikDurumu" defaultValue={d.askerlikDurumu ?? ""} className={inputCls}>
            <option value="">Seçiniz</option>
            {ASKERLIK_DURUMLARI.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
        <Field label="Durum">
          <select name="durum" defaultValue={d.durum ?? "BEKLEMEDE"} className={inputCls}>
            <option value="BEKLEMEDE">Beklemede</option>
            <option value="OLUMLU">Olumlu</option>
            <option value="OLUMSUZ">Olumsuz</option>
            <option value="ULASILAMADI">Ulaşılamadı</option>
          </select>
        </Field>
        <Field label="Ön Mülakat Sonucu">
          <select name="onMulakatSonucu" defaultValue={d.onMulakatSonucu ?? ""} className={inputCls}>
            <option value="">Yapılmadı</option>
            {ON_MULAKAT_SONUCLARI.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>
        <div className="flex items-end gap-5 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="engellilikDurumu" defaultChecked={d.engellilikDurumu} className="h-4 w-4 rounded border-line accent-blue-600" />
            Engellilik
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="emeklilikDurumu" defaultChecked={d.emeklilikDurumu} className="h-4 w-4 rounded border-line accent-blue-600" />
            Emeklilik
          </label>
        </div>
      </div>

      <Field label="Notlar" hint="Bu alan şifreli olarak saklanır.">
        <textarea name="notlar" defaultValue={d.notlar ?? ""} rows={3} className={inputCls} placeholder="Görüşme notları..." />
      </Field>

      {kvkkAlani ? (
        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">
          <input type="checkbox" name="kvkkOnay" className="mt-0.5 h-4 w-4 rounded accent-blue-600" />
          Adayın kişisel verilerinin işlenmesine ilişkin KVKK aydınlatma metni
          paylaşıldı ve açık rızası alındı.
        </label>
      ) : null}

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      ) : null}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </button>
    </form>
  );
}
