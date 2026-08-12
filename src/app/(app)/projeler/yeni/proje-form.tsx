"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { BOLGELER } from "@/lib/domain";
import { createProjectAction, type FormState } from "./actions";

export function ProjeForm({
  users,
  positions,
}: {
  users: { id: string; name: string }[];
  positions: { id: string; ad: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    createProjectAction,
    undefined
  );
  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Proje Adı *">
          <input name="ad" required className={inputCls} placeholder="İstanbul Havalimanı Temizlik" />
        </Field>
        <Field label="Proje Kodu *" hint="Benzersiz olmalı, ör. IST-TRM-011">
          <input name="kod" required className={inputCls} placeholder="IST-TRM-011" />
        </Field>
        <Field label="Bölge *">
          <select name="bolge" required className={inputCls}>
            {BOLGELER.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label="Kurum *">
          <input name="kurum" required className={inputCls} placeholder="Tepe Tesis Yönetimi" />
        </Field>
        <Field label="Segment *">
          <input name="segment" required className={inputCls} placeholder="Temizlik Hizmetleri" />
        </Field>
        <Field label="Masraf Merkezi">
          <input name="masrafMerkezi" className={inputCls} placeholder="MM-011" />
        </Field>
        <Field label="Proje İli *">
          <input name="il" required className={inputCls} placeholder="İstanbul" />
        </Field>
        <Field label="Proje İlçesi *">
          <input name="ilce" required className={inputCls} placeholder="Arnavutköy" />
        </Field>
        <Field label="İK Sorumlusu">
          <select name="ikSorumlusuId" className={inputCls}>
            <option value="">Seçiniz</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label="1. Yönetici">
          <input name="yonetici1" className={inputCls} />
        </Field>
        <Field label="2. Yönetici">
          <input name="yonetici2" className={inputCls} />
        </Field>
        <Field label="3. Yönetici">
          <input name="yonetici3" className={inputCls} />
        </Field>
      </div>

      <div className="rounded-xl border border-line p-4">
        <h3 className="mb-3 text-sm font-semibold">Başlangıç Norm Kadrosu (isteğe bağlı)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Pozisyon">
            <select name="pozisyonId" className={inputCls}>
              <option value="">Seçiniz</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.ad}</option>
              ))}
            </select>
          </Field>
          <Field label="Norm Kadro (MY)">
            <input name="normKadro" type="number" min={0} className={inputCls} placeholder="0" />
          </Field>
          <Field label="Aktif Kadro (MY)">
            <input name="aktifKadro" type="number" min={0} className={inputCls} placeholder="0" />
          </Field>
        </div>
      </div>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      ) : null}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Projeyi Kaydet
      </button>
    </form>
  );
}
