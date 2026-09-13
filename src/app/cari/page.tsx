import type { Metadata } from "next";
import { Search, PackageSearch } from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { PublicReportCard } from "@/components/public-report-card";
import { EmptyState, Input, Select, Button } from "@/components/ui";
import { CATEGORIES } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth";
import { searchPublicReports } from "@/lib/public-reports";
import type { ReportType } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cari Barang",
  description: "Telusuri barang hilang dan temuan yang dilaporkan komunitas.",
};

type SearchParams = Promise<{ q?: string; type?: string; category?: string }>;

export default async function CariPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const type = (sp.type === "LOST" || sp.type === "FOUND" ? sp.type : "ALL") as
    ReportType | "ALL";
  const [user, results] = await Promise.all([
    getSessionUser(),
    searchPublicReports({
      q: sp.q?.trim() || undefined,
      type,
      category: sp.category || undefined,
      limit: 60,
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader authed={Boolean(user)} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Cari barang hilang &amp; temuan
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Mungkin barangmu sudah ada di sini. Coba telusuri lebih dulu sebelum
          melapor.
        </p>

        <form
          method="get"
          className="mt-6 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 sm:grid-cols-[1fr_auto_auto_auto]"
        >
          <Input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari nama barang, deskripsi, atau lokasi…"
            aria-label="Kata kunci"
          />
          <Select name="type" defaultValue={type} aria-label="Jenis laporan">
            <option value="ALL">Semua</option>
            <option value="LOST">Hilang</option>
            <option value="FOUND">Ditemukan</option>
          </Select>
          <Select
            name="category"
            defaultValue={sp.category ?? ""}
            aria-label="Kategori"
          >
            <option value="">Semua kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Button type="submit">
            <Search className="size-4" />
            Cari
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-500">
          {results.length} barang ditemukan
        </p>

        {results.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<PackageSearch className="size-6" />}
              title="Belum ada barang yang cocok"
              description="Coba ubah kata kunci atau filter. Belum ada? Buat laporan agar komunitas ikut membantu mencari."
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((r) => (
              <PublicReportCard key={`${r.type}-${r.id}`} report={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
