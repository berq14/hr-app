"use client";

import { useActionState, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  LoaderCircle,
  PhoneOutgoing,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { Field, inputCls, btnPrimary, btnSecondary, cx } from "@/components/ui";
import {
  addQuestionAction,
  deleteQuestionAction,
  moveQuestionAction,
  runNowAction,
  saveIvrSettingsAction,
  toggleQuestionAction,
  type FormState,
  type TickResult,
} from "./actions";

function Mesaj({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>;
  if (state.ok)
    return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>;
  return null;
}

export function KampanyaAyarlariForm({
  defaults,
}: {
  defaults: { aktif: boolean; saat1: string; saat2: string; maxDeneme: number; olumluEsigi: number };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    saveIvrSettingsAction,
    undefined
  );
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          name="aktif"
          defaultChecked={defaults.aktif}
          className="h-4 w-4 accent-blue-600"
        />
        Otomatik arama kampanyası aktif
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="1. Arama Saati">
          <input name="saat1" type="time" defaultValue={defaults.saat1} className={inputCls} />
        </Field>
        <Field label="2. Arama Saati">
          <input name="saat2" type="time" defaultValue={defaults.saat2} className={inputCls} />
        </Field>
        <Field label="Maks. Deneme" hint="Ulaşılamayan aday kaç kez denensin?">
          <input name="maxDeneme" type="number" min={1} max={10} defaultValue={defaults.maxDeneme} className={inputCls} />
        </Field>
        <Field label="Olumlu Eşiği (%)" hint="Doğru cevap oranı bu eşiğin altındaysa Olumsuz.">
          <input name="olumluEsigi" type="number" min={1} max={100} defaultValue={defaults.olumluEsigi} className={inputCls} />
        </Field>
      </div>
      <Mesaj state={state} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Ayarları Kaydet
      </button>
    </form>
  );
}

export function YeniSoruForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    addQuestionAction,
    undefined
  );
  return (
    <form action={action} className="space-y-3">
      <Field
        label="Soru Metni"
        hint='Telefonda okunacak metin. Tuş yönlendirmesini de yazın: "... için 1&apos;e, ... için 2&apos;ye basınız."'
      >
        <textarea
          name="metin"
          rows={2}
          required
          className={inputCls}
          placeholder="Vardiyalı çalışma düzenine uygun musunuz? Uygunsanız 1'e, değilseniz 2'ye basınız."
        />
      </Field>
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Olumlu Sayılan Tuş">
          <select name="olumluTus" className={inputCls + " w-28"} defaultValue="1">
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input type="checkbox" name="eleyici" className="h-4 w-4 accent-blue-600" />
          Eleyici soru
          <span className="text-xs text-muted">(yanlış cevapta görüşme Olumsuz biter)</span>
        </label>
        <button type="submit" disabled={pending} className={btnSecondary}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Soru Ekle
        </button>
      </div>
      <Mesaj state={state} />
    </form>
  );
}

export function SoruSatiri({
  q,
  ilk,
  son,
}: {
  q: { id: string; sira: number; metin: string; olumluTus: string; eleyici: boolean; aktif: boolean };
  ilk: boolean;
  son: boolean;
}) {
  const [, startTransition] = useTransition();
  const [konusuyor, setKonusuyor] = useState(false);

  function dinle() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(q.metin);
    u.lang = "tr-TR";
    u.onend = () => setKonusuyor(false);
    setKonusuyor(true);
    window.speechSynthesis.speak(u);
  }

  return (
    <li
      className={cx(
        "flex flex-wrap items-center gap-2 rounded-xl border border-line p-3",
        !q.aktif && "opacity-50"
      )}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-brand">
        {q.sira}
      </span>
      <p className="min-w-0 flex-1 text-[13px]">{q.metin}</p>
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <span className="rounded bg-slate-100 px-1.5 py-0.5">Olumlu: {q.olumluTus}</span>
        {q.eleyici ? (
          <span className="rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-500">Eleyici</span>
        ) : null}
      </span>
      <span className="flex items-center gap-0.5">
        <button
          onClick={dinle}
          title="Sesli önizleme (tarayıcı TTS)"
          className={cx("rounded-lg p-1.5 hover:bg-slate-100", konusuyor ? "text-primary" : "text-muted")}
        >
          <Volume2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => startTransition(() => moveQuestionAction(q.id, "yukari"))}
          disabled={ilk}
          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 disabled:opacity-30"
          aria-label="Yukarı taşı"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          onClick={() => startTransition(() => moveQuestionAction(q.id, "asagi"))}
          disabled={son}
          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 disabled:opacity-30"
          aria-label="Aşağı taşı"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          onClick={() => startTransition(() => toggleQuestionAction(q.id))}
          className={cx(
            "relative ml-1 h-5 w-9 rounded-full transition",
            q.aktif ? "bg-emerald-500" : "bg-slate-300"
          )}
          title={q.aktif ? "Pasifleştir" : "Aktifleştir"}
        >
          <span
            className={cx(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
              q.aktif ? "left-[18px]" : "left-0.5"
            )}
          />
        </button>
        <button
          onClick={() => {
            if (confirm("Bu soru silinsin mi?")) startTransition(() => deleteQuestionAction(q.id));
          }}
          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
          aria-label="Sil"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </span>
    </li>
  );
}

export function SimdiCalistirButonu() {
  const [pending, startTransition] = useTransition();
  const [sonuc, setSonuc] = useState<TickResult | null>(null);
  return (
    <div className="space-y-3">
      <button
        onClick={() => startTransition(async () => setSonuc(await runNowAction()))}
        disabled={pending}
        className={btnPrimary}
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <PhoneOutgoing className="h-4 w-4" />
        )}
        Kampanya Turunu Şimdi Çalıştır (Simülasyon)
      </button>
      {sonuc ? (
        sonuc.ok ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Tur tamamlandı: {sonuc.yeniGorev} yeni görev, {sonuc.aranan} arama —{" "}
            {sonuc.ulasilan} ulaşıldı, {sonuc.ulasilamayan} tekrar denenecek,{" "}
            {sonuc.kapatilan} deneme hakkı bitti.
          </p>
        ) : (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{sonuc.error}</p>
        )
      ) : null}
    </div>
  );
}
