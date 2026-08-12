import type { LucideIcon } from "lucide-react";
import { ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Card, cx } from "./ui";
import { formatNumber } from "@/lib/domain";

const tones: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "bg-blue-50", fg: "text-blue-600" },
  green: { bg: "bg-emerald-50", fg: "text-emerald-600" },
  red: { bg: "bg-red-50", fg: "text-red-500" },
  purple: { bg: "bg-violet-50", fg: "text-violet-600" },
  orange: { bg: "bg-amber-50", fg: "text-amber-600" },
  cyan: { bg: "bg-cyan-50", fg: "text-cyan-600" },
  indigo: { bg: "bg-indigo-50", fg: "text-indigo-600" },
};

export function StatCard({
  icon: Icon,
  tone = "blue",
  title,
  value,
  suffix,
  delta,
  deltaLabel = "Son 30 gün",
  href,
}: {
  icon: LucideIcon;
  tone?: keyof typeof tones;
  title: string;
  value: string | number;
  suffix?: string;
  delta?: number | null;
  deltaLabel?: string;
  href?: string;
}) {
  const t = tones[tone] ?? tones.blue;
  const inner = (
    <Card className="relative h-full p-4 sm:p-5">
      {href ? (
        <ChevronRight className="absolute top-4 right-4 h-4 w-4 text-muted" />
      ) : null}
      <div className="flex items-start gap-3.5">
        <span
          className={cx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            t.bg,
            t.fg
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-[26px] font-bold leading-none tracking-tight">
            {typeof value === "number" ? formatNumber(value) : value}
            {suffix ? (
              <span className="ml-1 text-sm font-medium text-muted">{suffix}</span>
            ) : null}
          </p>
        </div>
      </div>
      {delta !== undefined && (
        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
          <span className="text-xs text-muted">{deltaLabel}</span>
          {delta === null ? (
            <span className="text-xs text-muted">—</span>
          ) : (
            <span
              className={cx(
                "flex items-center gap-0.5 text-xs font-semibold",
                delta >= 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              {delta >= 0 ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              %{Math.abs(delta).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
            </span>
          )}
        </div>
      )}
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
