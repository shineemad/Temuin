import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  HandHeart,
  ImageOff,
  MapPin,
  PackageCheck,
  PackageSearch,
} from "lucide-react";
import { PublicHeader } from "@/components/public-header";
import { Badge, ButtonLink, Card, ReportStatusBadge } from "@/components/ui";
import { categoryLabel } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth";
import { getPublicReport } from "@/lib/public-reports";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const report = await getPublicReport(id);
  return { title: report ? report.item_name : "Barang tidak ditemukan" };
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default async function BarangDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const [user, report] = await Promise.all([
    getSessionUser(),
    getPublicReport(id),
  ]);
  if (!report) notFound();

  const isLost = report.type === "LOST";

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader authed={Boolean(user)} />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/cari"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="size-4" />
          Kembali ke pencarian
        </Link>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden">
            <div className="aspect-[4/3] bg-slate-100">
              {report.has_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/public-images?type=${report.type.toLowerCase()}&id=${report.id}`}
                  alt={report.item_name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-slate-300">
                  <ImageOff className="size-12" />
                </div>
              )}
            </div>
          </Card>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={
                  isLost
                    ? "bg-brand-600 text-white ring-brand-700"
                    : "bg-amber-400 text-amber-950 ring-amber-500"
                }
              >
                {isLost ? (
                  <PackageSearch className="size-3" />
                ) : (
                  <HandHeart className="size-3" />
                )}
                {isLost ? "Barang Hilang" : "Barang Ditemukan"}
              </Badge>
              <ReportStatusBadge status={report.status} type={report.type} />
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900">
              {report.item_name}
            </h1>

            <dl className="mt-5 grid grid-cols-2 gap-4">
              <Meta label="Kategori" value={categoryLabel(report.category)} />
              {report.color && <Meta label="Warna" value={report.color} />}
              {report.brand && <Meta label="Merek" value={report.brand} />}
              <Meta
                label={isLost ? "Tanggal hilang" : "Tanggal ditemukan"}
                value={formatDate(report.date)}
              />
            </dl>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-400">
                {isLost ? "Lokasi terakhir terlihat" : "Lokasi ditemukan"}
              </p>
              <p className="inline-flex items-center gap-1.5 text-sm text-slate-800">
                <MapPin className="size-4 text-slate-400" />
                {report.location_name}
              </p>
            </div>

            {report.pos_name && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
                <PackageCheck className="mr-1.5 inline size-4" />
                Dititipkan di <strong>{report.pos_name}</strong>
              </div>
            )}
          </div>
        </div>

        <Card className="mt-6 p-5">
          <h2 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
            Deskripsi
          </h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-700">
            {report.description}
          </p>
        </Card>

        <Card className="mt-6 flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isLost ? "Menemukan barang ini?" : "Ini barang milikmu?"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {isLost
                ? "Laporkan sebagai temuan — sistem akan mencocokkannya secara otomatis."
                : "Buat laporan kehilangan agar sistem mencocokkan dan kamu bisa mengajukan klaim."}
            </p>
          </div>
          <ButtonLink
            href={isLost ? "/lapor/temuan" : "/lapor/hilang"}
            variant={isLost ? "amber" : "primary"}
          >
            {isLost ? "Saya menemukan ini" : "Ini barang saya"}
          </ButtonLink>
        </Card>
      </main>
    </div>
  );
}
