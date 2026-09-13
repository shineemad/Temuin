import Link from "next/link";
import { ImageOff, MapPin, PackageSearch, HandHeart } from "lucide-react";
import { Badge, ReportStatusBadge } from "@/components/ui";
import { categoryLabel } from "@/lib/constants";
import { formatDate, truncate } from "@/lib/utils";
import type { PublicReport } from "@/lib/types";

export function PublicReportCard({ report }: { report: PublicReport }) {
  const isLost = report.type === "LOST";
  return (
    <Link
      href={`/barang/${report.id}?t=${report.type.toLowerCase()}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-soft transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {report.has_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/public-images?type=${report.type.toLowerCase()}&id=${report.id}`}
            alt={report.item_name}
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-slate-300">
            <ImageOff className="size-10" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge
            className={
              isLost
                ? "bg-brand-600 text-white ring-brand-700"
                : "bg-amber-400 text-amber-950 ring-amber-500"
            }
          >
            {isLost ? (
              <PackageSearch className="size-3" />
            ) : (
              <HandHeart className="size-3" />
            )}
            {isLost ? "Hilang" : "Ditemukan"}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            {truncate(report.item_name, 40)}
          </h3>
          <ReportStatusBadge status={report.status} type={report.type} />
        </div>
        <p className="text-xs text-slate-500">
          {categoryLabel(report.category)}
        </p>
        <p className="mt-auto inline-flex items-center gap-1 pt-1 text-xs text-slate-500">
          <MapPin className="size-3 shrink-0" />
          {truncate(report.location_name, 38)}
        </p>
        <p className="text-[11px] text-slate-400">{formatDate(report.date)}</p>
      </div>
    </Link>
  );
}
