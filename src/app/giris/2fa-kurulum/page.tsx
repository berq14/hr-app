import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { generateTotpSecret, totpKeyUri } from "@/lib/totp";
import { AuthCard } from "../auth-card";
import { TotpForm } from "../dogrulama/totp-form";
import { setup2faAction } from "../actions";

export const metadata = { title: "2FA Kurulumu" };

export default async function Kurulum2faPage() {
  const session = await getSession();
  if (!session) redirect("/giris");
  if (session.twoFaOk) redirect("/");
  if (session.totpEnabled) redirect("/giris/dogrulama");

  const secret = generateTotpSecret();
  const uri = totpKeyUri(session.email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri, { width: 220, margin: 1 });

  return (
    <AuthCard
      title="İki Adımlı Doğrulama Kurulumu"
      subtitle="Hesap güvenliği için 2FA zorunludur. Google Authenticator, Microsoft Authenticator veya benzeri bir uygulamayla QR kodu tarayın."
    >
      <div className="mb-5 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="2FA kurulum QR kodu"
          className="rounded-xl border border-line"
          width={220}
          height={220}
        />
        <p className="text-center text-xs text-muted">
          QR kodu tarayamıyorsanız bu anahtarı elle girin:
          <br />
          <code className="mt-1 inline-block rounded bg-slate-100 px-2 py-1 font-mono text-[11px] tracking-wider">
            {secret}
          </code>
        </p>
      </div>
      <TotpForm
        action={setup2faAction}
        secret={secret}
        buttonLabel="Kurulumu Tamamla"
      />
    </AuthCard>
  );
}
