import type { Metadata } from "next";
import { HandHeart } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PageHeader } from "@/components/ui";
import { ReportForm } from "@/components/report-form";
import { createFoundReportAction } from "@/lib/actions/reports";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Laporkan Barang Ditemukan" };

export default async function LaporTemuanPage() {
  const user = await getSessionUser();
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader authed={Boolean(user)} />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <PageHeader
          title="Laporkan Barang Ditemukan"
          description="Terima kasih sudah membantu. Isi info verifikasi privat agar hanya pemilik asli yang bisa mengklaim."
          action={
            <span className="hidden rounded-2xl bg-amber-50 p-3 text-amber-600 sm:block">
              <HandHeart className="size-6" />
            </span>
          }
        />
        <ReportForm
          type="FOUND"
          action={createFoundReportAction}
          isAuthenticated={Boolean(user)}
          loginHref="/login?next=/lapor/temuan"
        />
      </main>
    </div>
  );
}
