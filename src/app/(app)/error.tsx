"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, ButtonLink, Card } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  return (
    <Card className="mx-auto max-w-lg p-8 text-center">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle className="size-6" />
      </div>
      <h1 className="font-display text-xl font-bold tracking-tight text-slate-900">
        Halaman ini gagal dimuat
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        Terjadi kendala saat mengambil data. Datamu aman — coba muat ulang
        halaman ini.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-slate-400">
          Kode error: {error.digest}
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>
          <RefreshCw className="size-4" />
          Coba lagi
        </Button>
        <ButtonLink variant="secondary" href="/dashboard">
          Ke Dashboard
        </ButtonLink>
      </div>
    </Card>
  );
}
