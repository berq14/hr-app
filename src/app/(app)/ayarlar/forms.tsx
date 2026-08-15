"use client";

import { useActionState } from "react";
import { LoaderCircle, Plus, KeyRound } from "lucide-react";
import { Field, inputCls, btnPrimary, btnSecondary } from "@/components/ui";
import {
  createApiKeyAction,
  createPositionAction,
  createSourceAction,
  createUserAction,
  toggleApiKeyAction,
  toggleUserAction,
  type FormState,
} from "./actions";

function Mesaj({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>;
  if (state.ok)
    return (
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm break-all text-emerald-700">
        {state.ok}
      </p>
    );
  return null;
}

export function YeniKullaniciForm({ sistemYoneticisi }: { sistemYoneticisi: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createUserAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Ad Soyad">
          <input name="name" required className={inputCls} placeholder="Ad Soyad" />
        </Field>
        <Field label="E-posta">
          <input name="email" type="email" required className={inputCls} placeholder="ad.soyad@sirket.com.tr" />
        </Field>
        <Field label="Rol">
          <select name="role" className={inputCls} defaultValue="IK_UZMANI">
            <option value="IK_ASISTANI">İK Asistanı</option>
            <option value="IK_UZMANI">İK Uzmanı</option>
            <option value="IK_YONETICISI">İK Yöneticisi</option>
            {sistemYoneticisi ? (
              <option value="SISTEM_YONETICISI">Sistem Yöneticisi</option>
            ) : null}
          </select>
        </Field>
        <Field label="Geçici Şifre" hint="En az 10 karakter, harf + rakam">
          <input name="password" type="password" required className={inputCls} placeholder="••••••••••" />
        </Field>
      </div>
      <Mesaj state={state} />
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Yeni Kullanıcı Ekle
      </button>
    </form>
  );
}

export function KullaniciDurumButonu({
  userId,
  aktif,
  kendisi,
}: {
  userId: string;
  aktif: boolean;
  kendisi: boolean;
}) {
  const toggle = toggleUserAction.bind(null, userId);
  return (
    <form action={toggle}>
      <button
        type="submit"
        disabled={kendisi}
        title={kendisi ? "Kendi hesabınızı pasifleştiremezsiniz" : aktif ? "Pasifleştir" : "Aktifleştir"}
        className={
          "relative h-5 w-9 rounded-full transition disabled:opacity-40 " +
          (aktif ? "bg-emerald-500" : "bg-slate-300")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all " +
            (aktif ? "left-[18px]" : "left-0.5")
          }
        />
      </button>
    </form>
  );
}

export function YeniPozisyonForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createPositionAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input name="ad" required className={inputCls + " min-w-40 flex-1"} placeholder="Pozisyon adı (ör. Depo Görevlisi)" />
        <button type="submit" disabled={pending} className={btnSecondary + " shrink-0"}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ekle
        </button>
      </div>
      <Mesaj state={state} />
    </form>
  );
}

export function YeniKaynakForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createSourceAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input name="ad" required className={inputCls + " min-w-40 flex-1"} placeholder="Kaynak adı (ör. eleman.net)" />
        <input
          name="maliyet"
          type="number"
          step="0.1"
          min="0"
          className={inputCls + " flex-none basis-28"}
          placeholder="₺/aday"
          aria-label="Aday başı maliyet"
        />
        <button type="submit" disabled={pending} className={btnSecondary + " shrink-0"}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ekle
        </button>
      </div>
      <Mesaj state={state} />
    </form>
  );
}

export function YeniApiAnahtariForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createApiKeyAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input name="ad" required className={inputCls + " min-w-40 flex-1"} placeholder="Anahtar adı (ör. Telesekreter Robotu)" />
        <button type="submit" disabled={pending} className={btnSecondary + " shrink-0"}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Anahtar Oluştur
        </button>
      </div>
      <Mesaj state={state} />
    </form>
  );
}

export function ApiAnahtarDurumButonu({ id, aktif }: { id: string; aktif: boolean }) {
  const toggle = toggleApiKeyAction.bind(null, id);
  return (
    <form action={toggle}>
      <button
        type="submit"
        title={aktif ? "Devre dışı bırak" : "Aktifleştir"}
        className={
          "relative h-5 w-9 rounded-full transition " +
          (aktif ? "bg-emerald-500" : "bg-slate-300")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all " +
            (aktif ? "left-[18px]" : "left-0.5")
          }
        />
      </button>
    </form>
  );
}
