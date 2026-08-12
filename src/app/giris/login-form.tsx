"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "./actions";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import { LoaderCircle } from "lucide-react";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    loginAction,
    undefined
  );
  return (
    <form action={action} className="space-y-4">
      <Field label="E-posta">
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="ornek@sirket.com.tr"
          className={inputCls}
        />
      </Field>
      <Field label="Şifre">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••••"
          className={inputCls}
        />
      </Field>
      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={btnPrimary + " w-full"}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Giriş Yap
      </button>
    </form>
  );
}
