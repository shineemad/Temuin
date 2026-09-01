import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Claim, FoundReport, LostReport } from "@/lib/types";
import { categoryLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import {
  Card,
  ClaimStatusBadge,
  PageHeader,
  ReportStatusBadge,
} from "@/components/ui";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();
  const db = supabaseAdmin();

  const [
    users,
    lost,
    found,
    matches,
    claims,
    recentLost,
    recentFound,
    recentClaims,
  ] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("lost_reports").select("id", { count: "exact", head: true }),
    db.from("found_reports").select("id", { count: "exact", head: true }),
    db.from("matches").select("id", { count: "exact", head: true }),
    db.from("claims").select("id", { count: "exact", head: true }),
    db
      .from("lost_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("found_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("claims")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: "Users", value: users.count ?? 0 },
    { label: "Lost Reports", value: lost.count ?? 0 },
    { label: "Found Reports", value: found.count ?? 0 },
    { label: "Matches", value: matches.count ?? 0 },
    { label: "Claims", value: claims.count ?? 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Admin Overview"
        description="Pemantauan ringkas platform. Fitur moderasi lanjutan ada di roadmap."
        action={
          <span className="rounded-2xl bg-slate-100 p-3 text-slate-500">
            <ShieldCheck className="size-6" />
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-slate-900 uppercase">
            Laporan Hilang Terbaru
          </h2>
          <ul className="divide-y divide-slate-100">
            {((recentLost.data ?? []) as LostReport[]).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/reports/${r.id}?t=lost`}
                    className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700"
                  >
                    {r.item_name}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {categoryLabel(r.category)} • {formatDateTime(r.created_at)}
                  </p>
                </div>
                <ReportStatusBadge status={r.status} type="LOST" />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-slate-900 uppercase">
            Laporan Temuan Terbaru
          </h2>
          <ul className="divide-y divide-slate-100">
            {((recentFound.data ?? []) as FoundReport[]).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/reports/${r.id}?t=found`}
                    className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700"
                  >
                    {r.item_name}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {categoryLabel(r.category)} • {formatDateTime(r.created_at)}
                  </p>
                </div>
                <ReportStatusBadge status={r.status} type="FOUND" />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-bold tracking-wide text-slate-900 uppercase">
          Klaim Terbaru
        </h2>
        <ul className="divide-y divide-slate-100">
          {((recentClaims.data ?? []) as Claim[]).map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <Link
                  href={`/claims/${c.id}`}
                  className="block truncate text-sm font-semibold text-slate-800 hover:text-brand-700"
                >
                  Klaim {c.id.slice(0, 8)}…
                </Link>
                <p className="text-xs text-slate-400">
                  {formatDateTime(c.created_at)}
                  {c.verification_score !== null &&
                    ` • verification ${Math.round(Number(c.verification_score))}%`}
                </p>
              </div>
              <ClaimStatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
