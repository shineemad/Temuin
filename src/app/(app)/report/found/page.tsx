import type { Metadata } from "next";
import { HandHeart } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ReportForm } from "@/components/report-form";
import { createFoundReportAction } from "@/lib/actions/reports";

export const metadata: Metadata = { title: "Laporkan Barang Ditemukan" };

export default function ReportFoundPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <PageHeader
        title="Laporkan Barang Ditemukan"
        description="Terima kasih sudah peduli. Data sensitif barang hanya dipakai untuk verifikasi pemilik — tidak dipublikasikan."
        action={
          <span className="hidden rounded-2xl bg-amber-50 p-3 text-amber-600 sm:block">
            <HandHeart className="size-6" />
          </span>
        }
      />
      <ReportForm type="FOUND" action={createFoundReportAction} />
    </div>
  );
}
