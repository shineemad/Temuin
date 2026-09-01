import { requireUser, getProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logoutAction } from "@/lib/actions/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  const { count } = await supabaseAdmin()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

  return (
    <AppShell
      name={profile?.full_name || user.email.split("@")[0]}
      email={user.email}
      isAdmin={profile?.role === "admin"}
      unreadCount={count ?? 0}
      onLogout={logoutAction}
    >
      {children}
    </AppShell>
  );
}
