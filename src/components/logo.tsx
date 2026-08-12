import { cx } from "./ui";

export function LunaLogo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LunaMark className={size === "md" ? "h-8 w-8" : "h-6 w-6"} />
      <span
        className={cx(
          "font-bold tracking-tight text-brand-dark",
          size === "md" ? "text-[26px]" : "text-lg"
        )}
      >
        Luna
      </span>
    </span>
  );
}

export function LunaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="20" fill="#2B2394" />
      <path
        d="M27 8a14 14 0 1 0 5 24A16 16 0 0 1 27 8Z"
        fill="#fff"
      />
      <circle cx="27.5" cy="13.5" r="3.5" fill="#4F9CF6" />
    </svg>
  );
}
