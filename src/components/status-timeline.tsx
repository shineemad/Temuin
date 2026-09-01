import { Check, Circle } from "lucide-react";
import type { ReportStatus, ReportType, StatusHistory } from "@/lib/types";
import { reportStatusLabel } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

const PIPELINE: ReportStatus[] = [
  "ACTIVE",
  "MATCH_FOUND",
  "CLAIMED",
  "VERIFICATION",
  "HANDOVER",
  "RETURNED",
];

/** Stepper horizontal pipeline status + riwayat perubahan nyata. */
export function StatusTimeline({
  type,
  current,
  history,
}: {
  type: ReportType;
  current: ReportStatus;
  history: StatusHistory[];
}) {
  const currentIdx = current === "CLOSED" ? -1 : PIPELINE.indexOf(current);

  return (
    <div className="space-y-6">
      {current === "CLOSED" ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
          Laporan ini telah ditutup.
        </p>
      ) : (
        <ol className="flex items-start">
          {PIPELINE.map((status, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <li key={status} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      i === 0
                        ? "bg-transparent"
                        : done || active
                          ? "bg-brand-500"
                          : "bg-slate-200",
                    )}
                  />
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2 transition",
                      done
                        ? "bg-brand-600 text-white ring-brand-600"
                        : active
                          ? "bg-white text-brand-700 ring-brand-600"
                          : "bg-white text-slate-300 ring-slate-200",
                    )}
                  >
                    {done ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      i === PIPELINE.length - 1
                        ? "bg-transparent"
                        : done
                          ? "bg-brand-500"
                          : "bg-slate-200",
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "mt-2 px-1 text-center text-[10px] font-semibold uppercase tracking-wide sm:text-[11px]",
                    active
                      ? "text-brand-700"
                      : done
                        ? "text-slate-600"
                        : "text-slate-300",
                  )}
                >
                  {reportStatusLabel(status, type)}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {history.length > 0 && (
        <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
          {[...history].reverse().map((h) => (
            <li key={h.id} className="relative">
              <Circle className="absolute -left-[23px] top-1 size-3 fill-brand-500 text-brand-500" />
              <p className="text-sm font-semibold text-slate-800">
                {reportStatusLabel(h.status, type)}
              </p>
              {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
              <p className="mt-0.5 text-[11px] text-slate-400">
                {formatDateTime(h.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
