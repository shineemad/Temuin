import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { ReportForm } from "@/components/report-form";
import { createLostReportAction } from "@/lib/actions/reports";

export const metadata: Metadata = { title: "Laporkan Barang Hilang" };

export default function ReportLostPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <PageHeader
        title="Laporkan Barang Hilang"
        description="Semakin detail laporan Anda, semakin akurat AI Temuin mencari kecocokan. Foto tidak wajib."
        action={
          <span className="hidden rounded-2xl bg-brand-50 p-3 text-brand-600 sm:block">
            <PackageSearch className="size-6" />
          </span>
        }
      />
      <ReportForm type="LOST" action={createLostReportAction} />
    </div>
  );
}
