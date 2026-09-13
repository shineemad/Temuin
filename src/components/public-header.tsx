import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

export function PublicHeader({ authed }: { authed?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="Beranda Temuin">
          <Logo />
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/cari"
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">Cari Barang</span>
          </Link>
          <ButtonLink href="/lapor/hilang" variant="secondary" size="sm">
            Lapor
          </ButtonLink>
          {authed ? (
            <ButtonLink href="/saya" size="sm">
              Akun Saya
            </ButtonLink>
          ) : (
            <ButtonLink href="/login" size="sm">
              Masuk
            </ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}
