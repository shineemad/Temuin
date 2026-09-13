import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PageHeader } from "@/components/ui";
import { ReportForm } from "@/components/report-form";
import { createLostReportAction } from "@/lib/actions/reports";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Laporkan Barang Hilang" };

export default async function LaporHilangPage() {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader authed={Boolean(user)} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <PageHeader
          title="Laporkan Barang Hilang"
          description="Semakin detail laporan Anda, semakin akurat AI Temuin mencari kecocokan. Foto tidak wajib."
          action={
            <span className="hidden rounded-2xl bg-brand-50 p-3 text-brand-600 sm:block">
              <PackageSearch className="size-6" />
            </span>
          }
        />
        <ReportForm
          type="LOST"
          action={createLostReportAction}
          isAuthenticated={Boolean(user)}
          loginHref="/login?next=/lapor/hilang"
        />
      </main>
    </div>
  );
}
