import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthCard } from "./auth-card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Giriş" };

export default async function GirisPage() {
  const session = await getSession();
  if (session?.twoFaOk) redirect("/");
  return (
    <AuthCard
      title="Oturum Açın"
      subtitle="Luna İK Platformu'na erişmek için kurumsal hesabınızla giriş yapın."
    >
      <LoginForm />
    </AuthCard>
  );
}
