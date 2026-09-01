import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { getProfile, requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { formatDate, initials } from "@/lib/utils";
import { Card, PageHeader } from "@/components/ui";
import { PasswordForm, ProfileForm } from "@/components/profile-forms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const db = supabaseAdmin();

  const [
    { count: lostCount },
    { count: foundCount },
    { count: returnedCount },
  ] = await Promise.all([
    db
      .from("lost_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    db
      .from("found_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    db
      .from("found_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "RETURNED"),
  ]);

  const name = profile?.full_name || user.email.split("@")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <PageHeader title="Profil" description="Kelola informasi akun Anda." />

      <Card className="flex items-center gap-4 p-6">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-brand-100 text-xl font-extrabold text-brand-700">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-900">{name}</h2>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Bergabung {profile ? formatDate(profile.created_at) : "-"}
            {profile?.role === "admin" && " • Admin"}
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Laporan Hilang", value: lostCount ?? 0 },
          { label: "Laporan Temuan", value: foundCount ?? 0 },
          { label: "Barang Dikembalikan", value: returnedCount ?? 0 },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
          <UserRound className="size-4 text-brand-500" />
          Informasi Akun
        </h2>
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? null}
          email={user.email}
        />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-900 uppercase">
          Keamanan
        </h2>
        <PasswordForm />
      </Card>
    </div>
  );
}
