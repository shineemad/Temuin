import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";

/** Layout split-screen untuk halaman login & register. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Panel brand */}
      <section className="grain relative hidden overflow-hidden bg-ink-950 lg:flex lg:flex-col">
        <div className="hero-grid absolute inset-0" />
        <div
          className="absolute -top-32 -left-32 size-[480px] rounded-full opacity-20 blur-3xl"
          style={{
            background: "radial-gradient(circle, #2398a1 0%, transparent 70%)",
          }}
        />
        <div className="relative flex h-full flex-col p-10">
          <Link href="/" className="w-fit">
            <Logo dark />
          </Link>

          <div className="my-auto max-w-md py-16">
            <h2 className="font-display text-4xl leading-[1.08] font-bold tracking-tight text-white">
              Yang hilang,
              <br />
              bisa ditemuin<span className="text-amber-400">.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
              AI mencocokkan laporan kehilangan dan penemuan, lalu verifikasi
              kepemilikan memastikan barang kembali ke tangan yang benar.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Matching otomatis dari deskripsi, lokasi & waktu",
                "Skor kecocokan yang bisa dijelaskan",
                "Info sensitif tidak pernah tampil publik",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-2.5 text-sm text-slate-300"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">
            © 2026 Temuin — dibuat untuk CREATHON 2026.
          </p>
        </div>
      </section>

      {/* Panel form */}
      <section className="flex flex-col bg-white px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-700"
          >
            <ArrowLeft className="size-4" />
            Beranda
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="font-display text-[26px] font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-1.5 mb-8 text-sm leading-relaxed text-slate-500">
            {subtitle}
          </p>
          {children}
        </div>
      </section>
    </main>
  );
}
