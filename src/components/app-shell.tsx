"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  FileSearch,
  HandHeart,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { cn, initials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export function AppShell({
  name,
  email,
  isAdmin,
  unreadCount,
  onLogout,
  children,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
  unreadCount: number;
  onLogout: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reports", label: "Laporan Saya", icon: FileSearch },
    { href: "/matches", label: "Matches", icon: Sparkles },
    { href: "/claims", label: "Klaim", icon: ShieldCheck },
    {
      href: "/notifications",
      label: "Notifikasi",
      icon: Bell,
      badge: unreadCount,
    },
    { href: "/impact", label: "Impact", icon: TrendingUp },
    { href: "/profile", label: "Profil", icon: UserRound },
  ];
  if (isAdmin) nav.push({ href: "/admin", label: "Admin", icon: ShieldCheck });

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <div className="space-y-2 px-4 pb-4">
        <Link
          href="/report/lost"
          onClick={closeMobile}
          className="flex items-center gap-2.5 rounded-xl bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <PackageSearch className="size-4.5" />
          Saya Kehilangan Barang
        </Link>
        <Link
          href="/report/found"
          onClick={closeMobile}
          className="flex items-center gap-2.5 rounded-xl bg-amber-400 px-3.5 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-amber-300"
        >
          <HandHeart className="size-4.5" />
          Saya Menemukan Barang
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-4">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeMobile}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
              isActive(item.href)
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <item.icon
              className={cn(
                "size-4.5",
                isActive(item.href) ? "text-brand-600" : "text-slate-400",
              )}
            />
            {item.label}
            {typeof item.badge === "number" && item.badge > 0 && (
              <span className="ml-auto rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {name}
            </p>
            <p className="truncate text-xs text-slate-400">{email}</p>
          </div>
          <form action={onLogout}>
            <button
              type="submit"
              title="Keluar"
              aria-label="Keluar dari akun"
              className="flex size-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/70 bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-lift animate-fade-in">
            <button
              className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
            >
              <X className="size-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Konten */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topbar mobile */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <LogoMark className="size-7" />
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              temuin<span className="text-amber-400">.</span>
            </span>
          </Link>
          <Link
            href="/notifications"
            className="relative ml-auto flex size-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Notifikasi"
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-600 ring-2 ring-white" />
            )}
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </main>

        {/* Bottom navigation mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          aria-label="Navigasi utama"
        >
          <div className="mx-auto grid h-16 max-w-md grid-cols-5">
            {[
              { href: "/dashboard", label: "Home", icon: LayoutDashboard },
              { href: "/reports", label: "Laporan", icon: FileSearch },
              { href: "/matches", label: "Matches", icon: Sparkles },
              { href: "/claims", label: "Klaim", icon: ShieldCheck },
              { href: "/profile", label: "Profil", icon: UserRound },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition",
                  isActive(item.href)
                    ? "text-brand-700"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <item.icon
                  className={cn(
                    "size-5",
                    isActive(item.href) ? "text-brand-600" : "",
                  )}
                />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
