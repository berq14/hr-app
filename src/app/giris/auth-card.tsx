import { LunaLogo } from "@/components/logo";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <LunaLogo />
        </div>
        <div className="rounded-2xl border border-line bg-card p-6 shadow-[0_4px_24px_rgba(16,24,40,0.06)] sm:p-8">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          © {new Date().getFullYear()} Luna İK Platformu — Yetkisiz erişim yasaktır.
        </p>
      </div>
    </div>
  );
}
