import type { Metadata } from "next";
import Link from "next/link";
import {
  FileSearch,
  HandHeart,
  MapPin,
  PackageSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getClaimsForUser } from "@/lib/claims";
import type { FoundReport, LostReport } from "@/lib/types";
import { categoryLabel } from "@/lib/constants";
import { cn, formatDate, truncate } from "@/lib/utils";
import {
  ButtonLink,
  Card,
  ClaimStatusBadge,
  DemoBadge,
  EmptyState,
  PageHeader,
  ReportStatusBadge,
} from "@/components/ui";

export const metadata: Metadata = { title: "Laporan Saya" };

function ReportCard({
  report,
  type,
  matchCount,
}: {
  report: LostReport | FoundReport;
  type: "LOST" | "FOUND";
  matchCount: number;
}) {
  const date =
    type === "LOST"
      ? (report as LostReport).lost_date
      : (report as FoundReport).found_date;
  return (
    <Link
      href={`/reports/${report.id}?t=${type.toLowerCase()}`}
      className="group block"
    >
      <Card className="h-full p-5 transition-all duration-200 group-hover:shadow-lift group-hover:ring-brand-200">
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-xl",
              type === "LOST"
                ? "bg-brand-50 text-brand-600"
                : "bg-amber-50 text-amber-600",
            )}
          >
            {type === "LOST" ? (
              <PackageSearch className="size-5" />
            ) : (
              <HandHeart className="size-5" />
            )}
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {report.is_demo && <DemoBadge />}
            <ReportStatusBadge status={report.status} type={type} />
          </div>
        </div>
        <h3 className="mt-3 font-bold text-slate-900 group-hover:text-brand-700">
          {truncate(report.item_name, 60)}
        </h3>
        <p className="mt-0.5 text-xs font-medium text-slate-400">
          {categoryLabel(report.category)} • {formatDate(date)}
        </p>
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <MapPin className="size-3.5 shrink-0 text-slate-400" />
          {truncate(report.location_name, 48)}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold",
              matchCount > 0 ? "text-brand-600" : "text-slate-400",
            )}
          >
            <Sparkles className="size-3.5" />
            {matchCount > 0
              ? `${matchCount} potential match`
              : "Belum ada match"}
          </span>
          <span className="text-xs font-medium text-slate-400 transition group-hover:text-brand-600">
            Detail →
          </span>
        </div>
      </Card>
    </Link>
  );
}

export default async function SayaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { tab } = await searchParams;
  const activeTab = tab === "found" ? "found" : "lost";
  const db = supabaseAdmin();

  const [{ data: lostRaw }, { data: foundRaw }, claims] = await Promise.all([
    db
      .from("lost_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    db
      .from("found_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    getClaimsForUser(user.id),
  ]);
  const lost = (lostRaw ?? []) as LostReport[];
  const found = (foundRaw ?? []) as FoundReport[];

  const lostIds = lost.map((r) => r.id);
  const foundIds = found.map((r) => r.id);
  const matchCount = new Map<string, number>();
  if (lostIds.length > 0 || foundIds.length > 0) {
    const orParts: string[] = [];
    if (lostIds.length > 0)
      orParts.push(`lost_report_id.in.(${lostIds.join(",")})`);
    if (foundIds.length > 0)
      orParts.push(`found_report_id.in.(${foundIds.join(",")})`);
    const { data: matchesRaw } = await db
      .from("matches")
      .select("lost_report_id, found_report_id")
      .or(orParts.join(","));
    for (const m of (matchesRaw ?? []) as Array<{
      lost_report_id: string;
      found_report_id: string;
    }>) {
      if (lostIds.includes(m.lost_report_id))
        matchCount.set(
          m.lost_report_id,
          (matchCount.get(m.lost_report_id) ?? 0) + 1,
        );
      if (foundIds.includes(m.found_report_id))
        matchCount.set(
          m.found_report_id,
          (matchCount.get(m.found_report_id) ?? 0) + 1,
        );
    }
  }

  const tabs = [
    {
      key: "lost",
      label: `Barang Hilang (${lost.length})`,
      href: "/saya?tab=lost",
    },
    {
      key: "found",
      label: `Barang Ditemukan (${found.length})`,
      href: "/saya?tab=found",
    },
  ];
  const items = activeTab === "lost" ? lost : found;
  const activeClaims = claims.filter(
    (c) => !["COMPLETED", "REJECTED"].includes(c.claim.status),
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title={`Halo, ${user.email.split("@")[0]}`}
        description="Laporan dan klaim kamu ada di sini."
        action={
          <div className="hidden gap-2 sm:flex">
            <ButtonLink href="/lapor/hilang">Lapor Hilang</ButtonLink>
            <ButtonLink href="/lapor/temuan" variant="amber">
              Lapor Temuan
            </ButtonLink>
          </div>
        }
      />

      {activeClaims.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
            <ShieldCheck className="size-4 text-brand-600" />
            Klaim Berjalan
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {activeClaims.map(({ claim, lost: l, found: f, role }) => (
              <Link
                key={claim.id}
                href={`/klaim/${claim.id}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm transition hover:bg-slate-100"
              >
                <span className="truncate font-medium text-slate-700">
                  {truncate(
                    role === "claimant" ? l.item_name : f.item_name,
                    32,
                  )}
                </span>
                <ClaimStatusBadge status={claim.status} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 sm:w-fit">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-center text-sm font-semibold transition sm:flex-none",
              activeTab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<FileSearch className="size-6" />}
          title={
            activeTab === "lost"
              ? "Belum ada laporan kehilangan"
              : "Belum ada laporan penemuan"
          }
          description={
            activeTab === "lost"
              ? "Kehilangan barang? Buat laporan dan biarkan AI Temuin mencarikan kecocokan."
              : "Menemukan barang tercecer? Laporkan agar pemiliknya bisa ditemukan."
          }
          action={
            <ButtonLink
              href={activeTab === "lost" ? "/lapor/hilang" : "/lapor/temuan"}
              variant={activeTab === "lost" ? "primary" : "amber"}
            >
              {activeTab === "lost"
                ? "Laporkan Barang Hilang"
                : "Laporkan Barang Ditemukan"}
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              type={activeTab === "lost" ? "LOST" : "FOUND"}
              matchCount={matchCount.get(report.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
