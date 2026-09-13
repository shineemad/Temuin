import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200/70 shadow-soft">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Compass className="size-6" />
        </div>
        <p className="font-display text-3xl font-bold tracking-tight text-slate-900">
          404
        </p>
        <h1 className="mt-1 text-sm font-semibold text-slate-900">
          Halaman tidak ditemukan
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Alamat yang kamu buka sudah dipindahkan atau memang tidak pernah ada.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/dashboard">Ke Dashboard</ButtonLink>
          <ButtonLink variant="secondary" href="/">
            Halaman utama
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
