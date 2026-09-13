import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  HandHeart,
  Info,
  Lock,
  MapPin,
  PackageSearch,
  ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMatchForUser } from "@/lib/matches";
import { categoryLabel } from "@/lib/constants";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { Claim } from "@/lib/types";
import {
  Badge,
  ButtonLink,
  Card,
  MatchLevelBadge,
  PageHeader,
  ScoreRing,
} from "@/components/ui";
import { ScoreBreakdown } from "@/components/score-breakdown";
import { SubmitClaimButton } from "@/components/claim-buttons";

export const metadata: Metadata = { title: "Detail Match" };

function SideCard({
  kind,
  title,
  category,
  color,
  location,
  date,
  time,
  description,
  imageSrc,
  mine,
}: {
  kind: "LOST" | "FOUND";
  title: string;
  category: string;
  color: string | null;
  location: string;
  date: string;
  time: string | null;
  description: string;
  imageSrc: string | null;
  mine: boolean;
}) {
  const isLost = kind === "LOST";
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex items-center gap-2 text-xs font-bold tracking-wide uppercase",
            isLost ? "text-brand-600" : "text-amber-600",
          )}
        >
          {isLost ? (
            <PackageSearch className="size-4" />
          ) : (
            <HandHeart className="size-4" />
          )}
          {isLost ? "Laporan Hilang" : "Laporan Ditemukan"}
        </span>
        {mine && (
          <Badge className="bg-slate-100 text-slate-500 ring-slate-200">
            Laporan Anda
          </Badge>
        )}
      </div>
      <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-xs font-medium text-slate-400">
        {categoryLabel(category)}
        {color ? ` • ${color}` : ""}
      </p>
      {imageSrc && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageSrc}
          alt={`Foto ${title}`}
          className="mt-3 h-40 w-full rounded-xl object-cover ring-1 ring-slate-200"
        />
      )}
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      <div className="mt-auto space-y-1.5 pt-4">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <MapPin className="size-3.5 text-slate-400" />
          {location}
        </p>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="size-3.5 text-slate-400" />
          {formatDate(date)}
          {time ? `, ${formatTime(time)}` : ""}
        </p>
      </div>
    </Card>
  );
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const ctx = await getMatchForUser(id, user.id);
  if (!ctx) notFound();
  const { match, lost, found, role } = ctx;

  // Klaim yang relevan dengan match ini.
  const { data: claimsRaw } = await supabaseAdmin()
    .from("claims")
    .select("*")
    .eq("match_id", match.id)
    .order("created_at", { ascending: false });
  const claims = (claimsRaw ?? []) as Claim[];
  const myClaim =
    role === "owner"
      ? claims.find((c) => c.claimant_id === user.id)
      : undefined;
  const activeClaim = claims.find((c) => c.status !== "REJECTED");

  const reportsInactive =
    ["RETURNED", "CLOSED"].includes(lost.status) ||
    ["RETURNED", "CLOSED"].includes(found.status);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Potential Match"
        description="AI menemukan kandidat — keputusan tetap melalui verifikasi kepemilikan, bukan AI semata."
      />

      {/* Skor utama */}
      <Card className="p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={match.final_score} size={120} strokeWidth={10} />
          <div className="text-center sm:text-left">
            <MatchLevelBadge level={match.match_level} />
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
              {Math.round(match.final_score)}% Match
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              {match.match_level === "HIGH"
                ? "Kecocokan sangat tinggi — kemungkinan besar ini barang yang sama."
                : match.match_level === "GOOD"
                  ? "Kecocokan baik — periksa detail perbandingan di bawah."
                  : match.match_level === "POSSIBLE"
                    ? "Ada kemungkinan cocok — teliti dulu sebelum mengajukan klaim."
                    : "Kecocokan rendah — kemungkinan bukan barang yang sama."}
            </p>
          </div>
          <div className="sm:ml-auto">
            <p className="text-center text-[11px] text-slate-400 sm:text-right">
              Dianalisis {formatDate(match.created_at)}
              <br />
              oleh Temuin Matching Engine
            </p>
          </div>
        </div>
      </Card>

      {/* Dua laporan */}
      <div className="relative grid gap-4 lg:grid-cols-2">
        <SideCard
          kind="LOST"
          title={lost.item_name}
          category={lost.category}
          color={lost.color}
          location={lost.location_name}
          date={lost.lost_date}
          time={lost.lost_time}
          description={lost.description}
          imageSrc={
            lost.image_url ? `/api/images?type=lost&id=${lost.id}` : null
          }
          mine={role === "owner"}
        />
        <SideCard
          kind="FOUND"
          title={found.item_name}
          category={found.category}
          color={found.color}
          location={found.location_name}
          date={found.found_date}
          time={found.found_time}
          description={found.description}
          imageSrc={
            found.image_url ? `/api/images?type=found&id=${found.id}` : null
          }
          mine={role === "finder"}
        />
        <span className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-2.5 shadow-lift ring-1 ring-slate-200 lg:flex">
          <ArrowRight className="size-4 text-brand-600" />
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Breakdown */}
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <h2 className="mb-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
            Explainable Match Score
          </h2>
          <p className="mb-3 text-xs text-slate-400">
            Mengapa sistem menganggap ini cocok? Skor akhir dihitung dari
            komponen berikut. Bobot dinormalisasi otomatis bila ada data yang
            tidak tersedia (mis. tanpa foto) — pengguna tanpa foto tidak
            dihukum.
          </p>
          <ScoreBreakdown components={match.explanation} />
        </Card>

        {/* CTA klaim */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
              <ShieldCheck className="size-4 text-brand-500" />
              {role === "owner" ? "Klaim Kepemilikan" : "Status Klaim"}
            </h2>

            {role === "owner" ? (
              myClaim ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Anda sudah mengajukan klaim untuk match ini.
                  </p>
                  <ButtonLink href={`/klaim/${myClaim.id}`} className="w-full">
                    Lihat Klaim Saya
                  </ButtonLink>
                </div>
              ) : reportsInactive ? (
                <p className="text-sm text-slate-500">
                  Laporan pada match ini sudah selesai / ditutup, klaim tidak
                  tersedia.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-slate-600">
                    Yakin ini barang Anda? Ajukan klaim dan buktikan kepemilikan
                    lewat pertanyaan verifikasi.
                  </p>
                  <SubmitClaimButton matchId={match.id} />
                </div>
              )
            ) : activeClaim ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  Ada klaim{" "}
                  {activeClaim.status === "COMPLETED"
                    ? "yang telah selesai"
                    : "aktif"}{" "}
                  untuk barang temuan Anda.
                </p>
                <ButtonLink
                  href={`/klaim/${activeClaim.id}`}
                  className="w-full"
                >
                  Lihat Klaim
                </ButtonLink>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-500">
                Pemilik barang telah menerima notifikasi match ini. Anda akan
                diberi tahu bila ada klaim masuk.
              </p>
            )}
          </Card>

          {/* Privacy note */}
          <Card className="bg-slate-50/70 p-5">
            <p className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500">
              <Lock className="mt-0.5 size-4 shrink-0 text-slate-400" />
              Demi keamanan, identitas dan kontak kedua pihak tidak dibagikan
              pada tahap ini. Ciri rahasia barang serta info verifikasi privat
              penemu juga disembunyikan untuk mencegah klaim palsu.
            </p>
          </Card>

          <Card className="bg-brand-50/60 p-5 ring-brand-100">
            <p className="flex items-start gap-2.5 text-xs leading-relaxed text-brand-800">
              <Info className="mt-0.5 size-4 shrink-0 text-brand-500" />
              AI hanya menemukan kandidat dan tidak pernah memastikan
              kepemilikan. Keputusan akhir ada pada verifikasi jawaban dan
              persetujuan penemu.
            </p>
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={
            role === "owner"
              ? `/reports/${lost.id}?t=lost`
              : `/reports/${found.id}?t=found`
          }
          className="font-medium text-brand-600 hover:text-brand-700"
        >
          ← Kembali ke laporan saya
        </Link>
      </div>
    </div>
  );
}
