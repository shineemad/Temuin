import { Check, HelpCircle, Minus, X } from "lucide-react";
import type { MatchComponent } from "@/lib/types";
import { cn } from "@/lib/utils";

function iconFor(c: MatchComponent) {
  if (!c.available || c.score === null)
    return <Minus className="size-3.5 text-slate-400" />;
  if (c.score >= 0.6) return <Check className="size-3.5 text-emerald-600" />;
  if (c.score >= 0.3) return <HelpCircle className="size-3.5 text-amber-500" />;
  return <X className="size-3.5 text-rose-500" />;
}

function barColor(score: number | null): string {
  if (score === null) return "bg-slate-200";
  if (score >= 0.6) return "bg-emerald-500";
  if (score >= 0.3) return "bg-amber-400";
  return "bg-rose-400";
}

/** Explainable Match Score — breakdown per komponen dengan bobot yang dipakai. */
export function ScoreBreakdown({
  components,
}: {
  components: MatchComponent[];
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {components.map((c) => (
        <li key={c.key} className="flex items-center gap-3 py-3">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
              !c.available || c.score === null
                ? "bg-slate-50 ring-slate-200"
                : c.score >= 0.6
                  ? "bg-emerald-50 ring-emerald-200"
                  : c.score >= 0.3
                    ? "bg-amber-50 ring-amber-200"
                    : "bg-rose-50 ring-rose-200",
            )}
          >
            {iconFor(c)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-slate-800">{c.label}</p>
              <p className="shrink-0 text-xs font-medium text-slate-400">
                {c.available && c.score !== null ? (
                  <>
                    <span className="font-bold text-slate-700">
                      {Math.round(c.score * 100)}%
                    </span>
                    {c.weight > 0 && (
                      <span className="ml-1.5">bobot {c.weight}%</span>
                    )}
                  </>
                ) : (
                  "tidak tersedia"
                )}
              </p>
            </div>
            <p
              className="mt-0.5 truncate text-xs text-slate-500"
              title={c.detail}
            >
              {c.detail}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  barColor(c.available ? c.score : null),
                )}
                style={{
                  width: `${c.available && c.score !== null ? Math.max(3, c.score * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
