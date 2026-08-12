"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Field, inputCls, btnPrimary } from "@/components/ui";
import type { FormState } from "../actions";

export function TotpForm({
  action,
  secret,
  buttonLabel = "Doğrula",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  secret?: string;
  buttonLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    undefined
  );
  return (
    <form action={formAction} className="space-y-4">
      {secret ? <input type="hidden" name="secret" value={secret} /> : null}
      <Field label="Doğrulama Kodu">
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          placeholder="000000"
          className={inputCls + " text-center text-xl tracking-[0.5em]"}
        />
      </Field>
      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={btnPrimary + " w-full"}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {buttonLabel}
      </button>
    </form>
  );
}
