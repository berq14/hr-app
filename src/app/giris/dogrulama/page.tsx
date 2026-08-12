import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthCard } from "../auth-card";
import { TotpForm } from "./totp-form";
import { verify2faAction } from "../actions";

export const metadata = { title: "İki Adımlı Doğrulama" };

export default async function DogrulamaPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.twoFaOk) redirect("/");
  if (!session.totpEnabled) redirect("/giris/2fa-kurulum");

  return (
    <AuthCard
      title="İki Adımlı Doğrulama"
      subtitle="Kimlik doğrulayıcı uygulamanızdaki 6 haneli kodu girin."
    >
      <TotpForm action={verify2faAction} />
    </AuthCard>
  );
}
