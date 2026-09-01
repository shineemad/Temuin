"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { ConfirmActionButton } from "@/components/confirm-dialog";
import { closeReportAction, retryAiAction } from "@/lib/actions/reports";
import type { ReportType } from "@/lib/types";

export function RetryAiButton({
  type,
  reportId,
}: {
  type: ReportType;
  reportId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const result = await retryAiAction(type, reportId);
      if (result.ok) {
        toast.success(result.message ?? "Analisis AI dijalankan ulang.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menjalankan analisis.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={run} loading={loading}>
      <RefreshCw className="size-3.5" />
      Analisis ulang AI
    </Button>
  );
}

export function CloseReportButton({
  type,
  reportId,
}: {
  type: ReportType;
  reportId: string;
}) {
  const router = useRouter();

  return (
    <ConfirmActionButton
      title="Tutup laporan ini?"
      description="Laporan yang ditutup tidak lagi diikutkan dalam pencocokan AI. Gunakan bila barang sudah kembali dengan cara lain atau laporan tidak relevan lagi."
      confirmLabel="Tutup Laporan"
      danger
      variant="danger-outline"
      action={async () => {
        const result = await closeReportAction(type, reportId);
        if (result.ok) {
          toast.success("Laporan ditutup.");
          router.refresh();
        } else {
          toast.error(result.error ?? "Gagal menutup laporan.");
        }
      }}
    >
      <Archive className="size-3.5" />
      Tutup Laporan
    </ConfirmActionButton>
  );
}
