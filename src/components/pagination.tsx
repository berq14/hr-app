import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "./ui";

function pageHref(base: string, params: URLSearchParams, sayfa: number) {
  const next = new URLSearchParams(params);
  if (sayfa <= 1) next.delete("sayfa");
  else next.set("sayfa", String(sayfa));
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total];
  if (current >= total - 2) return [1, "...", total - 2, total - 1, total];
  return [1, "...", current, "...", total];
}

export function Pagination({
  base,
  params,
  sayfa,
  sayfaSayisi,
}: {
  base: string;
  params: Record<string, string | string[] | undefined>;
  sayfa: number;
  sayfaSayisi: number;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string" && v) sp.set(k, v);
  }
  const btn =
    "flex h-8 min-w-8 items-center justify-center rounded-lg border border-line bg-white px-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50";
  return (
    <nav className="flex items-center gap-1.5" aria-label="Sayfalama">
      {sayfa > 1 ? (
        <Link href={pageHref(base, sp, sayfa - 1)} className={btn} aria-label="Önceki">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cx(btn, "pointer-events-none opacity-40")}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      {pageNumbers(sayfa, sayfaSayisi).map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageHref(base, sp, p)}
            className={cx(
              btn,
              p === sayfa && "border-primary bg-primary text-white hover:bg-primary"
            )}
          >
            {p}
          </Link>
        )
      )}
      {sayfa < sayfaSayisi ? (
        <Link href={pageHref(base, sp, sayfa + 1)} className={btn} aria-label="Sonraki">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cx(btn, "pointer-events-none opacity-40")}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
