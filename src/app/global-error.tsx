"use client";

// Fallback terakhir: dipakai saat root layout sendiri gagal, jadi harus
// merender <html>/<body> dan tidak boleh bergantung pada komponen app.
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global] render error:", error);
  }, [error]);

  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-slate-200">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Terjadi kesalahan
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Temuin gagal memuat aplikasi. Silakan coba lagi beberapa saat lagi.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-[11px] text-slate-400">
              Kode error: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            Muat ulang
          </button>
        </div>
      </body>
    </html>
  );
}
