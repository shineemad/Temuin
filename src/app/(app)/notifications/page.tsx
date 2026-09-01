import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AppNotification, NotificationType } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Notifikasi" };

const ICON_BY_TYPE: Record<
  NotificationType,
  { icon: React.ReactNode; className: string }
> = {
  MATCH_FOUND: {
    icon: <Sparkles className="size-4" />,
    className: "bg-violet-50 text-violet-600",
  },
  CLAIM_SUBMITTED: {
    icon: <ShieldCheck className="size-4" />,
    className: "bg-sky-50 text-sky-600",
  },
  CLAIM_VERIFIED: {
    icon: <ShieldCheck className="size-4" />,
    className: "bg-amber-50 text-amber-600",
  },
  CLAIM_APPROVED: {
    icon: <CheckCircle2 className="size-4" />,
    className: "bg-emerald-50 text-emerald-600",
  },
  CLAIM_REJECTED: {
    icon: <XCircle className="size-4" />,
    className: "bg-rose-50 text-rose-600",
  },
  NEW_MESSAGE: {
    icon: <MessageCircle className="size-4" />,
    className: "bg-brand-50 text-brand-600",
  },
  ITEM_RETURNED: {
    icon: <CheckCircle2 className="size-4" />,
    className: "bg-emerald-50 text-emerald-600",
  },
  SYSTEM: {
    icon: <Bell className="size-4" />,
    className: "bg-slate-100 text-slate-500",
  },
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const db = supabaseAdmin();

  const { data: notificationsRaw } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const notifications = (notificationsRaw ?? []) as AppNotification[];

  // Tandai semua terbaca setelah daftar diambil (state unread masih tampil di render ini).
  const hasUnread = notifications.some((n) => !n.read);
  if (hasUnread) {
    await db
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <PageHeader
        title="Notifikasi"
        description="Match baru, perkembangan klaim, dan pesan — semuanya di satu tempat."
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-6" />}
          title="Belum ada notifikasi"
          description="Anda akan menerima notifikasi saat AI menemukan potential match atau ada perkembangan klaim."
        />
      ) : (
        <Card className="divide-y divide-slate-100 p-2">
          {notifications.map((n) => {
            const meta = ICON_BY_TYPE[n.type] ?? ICON_BY_TYPE.SYSTEM;
            const inner = (
              <div className="flex items-start gap-3 px-3 py-3.5">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                    meta.className,
                  )}
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="size-2 shrink-0 rounded-full bg-brand-500" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
                    {n.body}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
            );
            return n.link ? (
              <Link
                key={n.id}
                href={n.link}
                className="block rounded-xl transition hover:bg-slate-50"
              >
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
