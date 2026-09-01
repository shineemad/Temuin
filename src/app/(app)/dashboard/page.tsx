import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  FileSearch,
  HandHeart,
  PackageSearch,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { getProfile, requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMatchesForUser } from "@/lib/matches";
import { getClaimsForUser } from "@/lib/claims";
import type { AppNotification } from "@/lib/types";
import { timeAgo, truncate } from "@/lib/utils";
import { Card, MatchLevelBadge, ScoreRing } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

function StatCard({
  label,
  value,
  icon,
  href,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  accent: string;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="p-5 transition-all duration-200 group-hover:shadow-lift group-hover:ring-brand-200">
        <div className="flex items-center justify-between">
          <span
            className={`flex size-10 items-center justify-center rounded-xl ${accent}`}
          >
            {icon}
          </span>
          <ArrowRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
        </div>
        <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const db = supabaseAdmin();

  const [lostRes, foundRes, matches, claims, notificationsRes] =
    await Promise.all([
      db.from("lost_reports").select("id,status").eq("user_id", user.id),
      db.from("found_reports").select("id,status").eq("user_id", user.id),
      getMatchesForUser(user.id),
      getClaimsForUser(user.id),
      db
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const lost = (lostRes.data ?? []) as Array<{ id: string; status: string }>;
  const found = (foundRes.data ?? []) as Array<{ id: string; status: string }>;
  const activeReports =
    lost.filter((r) => !["RETURNED", "CLOSED"].includes(r.status)).length +
    found.filter((r) => !["RETURNED", "CLOSED"].includes(r.status)).length;
  const pendingClaims = claims.filter((c) =>
    ["SUBMITTED", "UNDER_VERIFICATION", "APPROVED", "HANDOVER"].includes(
      c.claim.status,
    ),
  ).length;
  const returnedItems =
    lost.filter((r) => r.status === "RETURNED").length +
    found.filter((r) => r.status === "RETURNED").length;
  const notifications = (notificationsRes.data ?? []) as AppNotification[];
  const topMatches = matches.slice(0, 3);

  const firstName = (profile?.full_name || user.email)
    .split(" ")[0]
    .split("@")[0];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Greeting + CTA */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Halo, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Selamat datang di Temuin. Apa yang bisa kami bantu hari ini?
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link href="/report/lost" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white shadow-lift transition-transform duration-200 group-hover:-translate-y-0.5">
              <PackageSearch className="size-8 opacity-90" />
              <h2 className="mt-3 text-lg font-bold">Saya Kehilangan Barang</h2>
              <p className="mt-1 text-sm text-brand-100">
                Buat laporan — AI langsung mencari kecocokan dari barang-barang
                yang ditemukan.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                Laporkan sekarang
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </span>
              <Sparkles className="absolute -top-4 -right-4 size-28 text-white/10" />
            </div>
          </Link>
          <Link href="/report/found" className="group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-6 text-amber-950 shadow-lift transition-transform duration-200 group-hover:-translate-y-0.5">
              <HandHeart className="size-8 opacity-90" />
              <h2 className="mt-3 text-lg font-bold">Saya Menemukan Barang</h2>
              <p className="mt-1 text-sm text-amber-900/80">
                Bantu kembalikan ke pemiliknya — identitas dan detail rahasia
                tetap terlindungi.
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
                Laporkan temuan
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </span>
              <HandHeart className="absolute -top-4 -right-4 size-28 text-amber-950/10" />
            </div>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Reports"
          value={activeReports}
          href="/reports"
          icon={<FileSearch className="size-5 text-brand-600" />}
          accent="bg-brand-50"
        />
        <StatCard
          label="Potential Matches"
          value={matches.length}
          href="/matches"
          icon={<Sparkles className="size-5 text-violet-600" />}
          accent="bg-violet-50"
        />
        <StatCard
          label="Pending Claims"
          value={pendingClaims}
          href="/claims"
          icon={<ShieldCheck className="size-5 text-amber-600" />}
          accent="bg-amber-50"
        />
        <StatCard
          label="Returned Items"
          value={returnedItems}
          href="/reports"
          icon={<CheckCircle2 className="size-5 text-emerald-600" />}
          accent="bg-emerald-50"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top matches */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Potential Matches Teratas
            </h2>
            {matches.length > 0 && (
              <Link
                href="/matches"
                className="text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                Lihat semua
              </Link>
            )}
          </div>
          {topMatches.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="mx-auto size-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                Belum ada match
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-400">
                Buat laporan — AI Temuin membandingkan setiap laporan baru
                secara otomatis dan memberi tahu Anda bila ada kecocokan.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {topMatches.map(({ match, lost: l, found: f, role }) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="group block"
                >
                  <Card className="flex items-center gap-4 p-4 transition-all group-hover:shadow-lift group-hover:ring-brand-200">
                    <ScoreRing
                      score={match.final_score}
                      size={64}
                      strokeWidth={6}
                    />
                    <div className="min-w-0 flex-1">
                      <MatchLevelBadge level={match.match_level} />
                      <p className="mt-1 truncate font-bold text-slate-900">
                        {truncate(
                          role === "owner" ? l.item_name : f.item_name,
                          48,
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {role === "owner"
                          ? "Kandidat barang Anda yang hilang"
                          : "Kandidat pemilik barang temuan Anda"}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Aktivitas Terbaru
            </h2>
            <Link
              href="/notifications"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Semua
            </Link>
          </div>
          <Card className="divide-y divide-slate-100 p-2">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="mx-auto size-6 text-slate-300" />
                <p className="mt-2 text-xs text-slate-400">
                  Belum ada aktivitas.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link ?? "/notifications"}
                  className="block px-3 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex items-start gap-2.5">
                    {!n.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {n.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-slate-500">
                        {n.body}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}
