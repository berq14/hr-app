"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Funnel, Search, X } from "lucide-react";
import { cx, inputCls } from "./ui";

export type FilterDef =
  | { tip: "select"; ad: string; etiket: string; secenekler: { value: string; label: string }[] }
  | { tip: "tarih-araligi"; adFrom: string; adTo: string; etiket: string };

/**
 * URL arama parametreleri üzerinden çalışan filtre çubuğu.
 * Sunucu bileşeni searchParams'ı okuyarak veriyi süzer.
 */
export function FilterBar({
  arama,
  filtreler,
  temizleButonu = true,
}: {
  arama?: { placeholder: string };
  filtreler: FilterDef[];
  temizleButonu?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("sayfa"); // filtre değişince ilk sayfa
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    },
    [params, pathname, router]
  );

  // arama kutusunda yazmayı bekle (debounce)
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => setParam({ q }), 350);
    return () => clearTimeout(t);
  }, [q, params, setParam]);

  const aktifFiltreVar =
    [...params.keys()].filter((k) => !["sayfa", "adet", "sekme"].includes(k)).length > 0;

  return (
    <div className="flex flex-wrap items-end gap-3">
      {arama ? (
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={arama.placeholder}
            className={cx(inputCls, "pl-9")}
          />
        </div>
      ) : null}

      {filtreler.map((f) =>
        f.tip === "select" ? (
          <label key={f.ad} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{f.etiket}</span>
            <select
              value={params.get(f.ad) ?? ""}
              onChange={(e) => setParam({ [f.ad]: e.target.value || null })}
              className={cx(inputCls, "w-36 sm:w-40")}
            >
              <option value="">Tümü</option>
              {f.secenekler.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label key={f.adFrom} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">{f.etiket}</span>
            <span className="flex items-center gap-1.5">
              <input
                type="date"
                value={params.get(f.adFrom) ?? ""}
                onChange={(e) => setParam({ [f.adFrom]: e.target.value || null })}
                className={cx(inputCls, "w-[8.7rem]")}
              />
              <span className="text-muted">–</span>
              <input
                type="date"
                value={params.get(f.adTo) ?? ""}
                onChange={(e) => setParam({ [f.adTo]: e.target.value || null })}
                className={cx(inputCls, "w-[8.7rem]")}
              />
            </span>
          </label>
        )
      )}

      {temizleButonu && aktifFiltreVar ? (
        <button
          onClick={() => {
            setQ("");
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-primary hover:bg-blue-50"
        >
          <Funnel className="h-4 w-4" />
          Filtreleri Temizle
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
