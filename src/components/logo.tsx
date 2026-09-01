import { cn } from "@/lib/utils";

/** Logomark TEMUIN: lensa pencarian dengan titik "ditemukan" + sinyal radar. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className ?? "size-9")}
    >
      <rect width="48" height="48" rx="14" fill="#1a7c87" />
      <circle cx="22" cy="21" r="9.5" stroke="white" strokeWidth="3.2" />
      <path
        d="M29.5 28.5L36 35"
        stroke="white"
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <circle cx="22" cy="21" r="3" fill="#fbbf24" />
      <path
        d="M33.5 13.5a13.4 13.4 0 0 1 2.4 4.3"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M10.2 27.8a13.4 13.4 0 0 1-.6-4.9"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight leading-none",
        dark ? "text-white" : "text-slate-900",
        className ?? "text-xl",
      )}
    >
      temuin
      <span className="text-amber-400">.</span>
    </span>
  );
}

export function Logo({
  className,
  dark = false,
  markClassName,
  textClassName,
}: {
  className?: string;
  dark?: boolean;
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <Wordmark dark={dark} className={textClassName} />
    </span>
  );
}
