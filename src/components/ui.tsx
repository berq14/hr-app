import { type ReactNode } from "react";

/** Küçük, tekrar kullanılabilir arayüz parçaları — Luna görsel dili. */

export function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export function Card({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={cx(
        "rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-500",
  orange: "bg-amber-50 text-amber-600",
  gray: "bg-slate-100 text-slate-500",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-violet-50 text-violet-600",
};

export function durumBadgeColor(durum: string): string {
  switch (durum) {
    case "OLUMLU":
    case "Olumlu":
    case "Aktif":
      return "green";
    case "OLUMSUZ":
    case "Olumsuz":
      return "red";
    case "BEKLEMEDE":
    case "Beklemede":
    case "Pasif":
      return "orange";
    default:
      return "gray";
  }
}

export function Badge({
  color = "gray",
  children,
}: {
  color?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        badgeStyles[color] ?? badgeStyles.gray
      )}
    >
      {children}
    </span>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr-TR");
  // isimden deterministik renk
  let hashVal = 0;
  for (const ch of name) hashVal = (hashVal * 31 + ch.charCodeAt(0)) >>> 0;
  const palette = [
    "bg-blue-500",
    "bg-violet-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-fuchsia-500",
  ];
  return (
    <span
      className={cx(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
        palette[hashVal % palette.length],
        className
      )}
    >
      {initials}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Form etiketi + alan sarmalayıcı */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-muted";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-primary transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-slate-100 hover:text-foreground focus:outline-none";
