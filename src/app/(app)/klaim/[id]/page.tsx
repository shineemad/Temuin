import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  PackageCheck,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getClaimForUser } from "@/lib/claims";
import { getPos } from "@/lib/pos";
import { buildVerificationQuestions } from "@/lib/verification";
import { categoryLabel } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ClaimStatus } from "@/lib/types";
import { Card, ClaimStatusBadge, PageHeader, ScoreRing } from "@/components/ui";
import { VerificationForm } from "@/components/claim-panels";

export const metadata: Metadata = { title: "Detail Klaim" };

const PIPELINE: ClaimStatus[] = [
  "SUBMITTED",
  "UNDER_VERIFICATION",
  "APPROVED",
  "HANDOVER",
  "COMPLETED",
];

const STEP_LABEL: Record<string, string> = {
  SUBMITTED: "Diajukan",
  UNDER_VERIFICATION: "Verifikasi",
  APPROVED: "Disetujui",
  HANDOVER: "Serah Terima",
  COMPLETED: "Selesai",
};

function Stepper({ status }: { status: ClaimStatus }) {
  if (status === "REJECTED") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
        <XCircle className="size-5" />
        Klaim ditolak operator
      </div>
    );
  }
  const idx = PIPELINE.indexOf(status);
  return (
    <ol className="flex items-center">
      {PIPELINE.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full items-center">
            <div
              className={cn(
                "h-0.5 flex-1",
                i === 0
                  ? "bg-transparent"
                  : i <= idx
                    ? "bg-brand-500"
                    : "bg-slate-200",
              )}
            />
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ring-2",
                i < idx
                  ? "bg-brand-600 text-white ring-brand-600"
                  : i === idx
                    ? "bg-white text-brand-700 ring-brand-600"
                    : "bg-white text-slate-300 ring-slate-200",
              )}
            >
              {i + 1}
            </span>
            <div
              className={cn(
                "h-0.5 flex-1",
                i === PIPELINE.length - 1
                  ? "bg-transparent"
                  : i < idx
                    ? "bg-brand-500"
                    : "bg-slate-200",
              )}
            />
          </div>
          <span
            className={cn(
              "text-center text-[10px] font-semibold tracking-wide uppercase",
              i === idx
                ? "text-brand-700"
                : i < idx
                  ? "text-slate-600"
                  : "text-slate-300",
            )}
          >
            {STEP_LABEL[s]}
          </span>
        </li>
      ))}
    </ol>
  );
}

type Params = Promise<{ id: string }>;

export default async function KlaimDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const user = await requireUser();
  const ctx = await getClaimForUser(id, user.id);
  if (!ctx) notFound();

  const { claim, lost, found, isClaimant, verification } = ctx;
  const questions = buildVerificationQuestions(found);
  const pos = found.pos_id ? await getPos(found.pos_id) : null;
  const itemName = isClaimant ? lost.item_name : found.item_name;

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
      <PageHeader
        title={itemName}
        description={`${categoryLabel(lost.category)} • ${isClaimant ? "Klaim kepemilikan kamu" : "Klaim atas barang temuanmu"}`}
        action={<ClaimStatusBadge status={claim.status} />}
      />

      <Card className="p-5 sm:p-6">
        <Stepper status={claim.status} />
      </Card>

      {/* Claimant mengisi verifikasi */}
      {isClaimant && claim.status === "SUBMITTED" && (
        <Card className="p-5 sm:p-6">
          <h2 className="mb-1 inline-flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
            <ShieldCheck className="size-4 text-brand-600" />
            Buktikan kepemilikan
          </h2>
          <p className="mb-4 text-sm text-slate-500">
            Jawab pertanyaan berikut sedetail mungkin. Operator akan meninjau
            jawabanmu dibantu AI.
          </p>
          <VerificationForm claimId={claim.id} questions={questions} />
        </Card>
      )}

      {/* Sudah dikirim, menunggu operator */}
      {claim.status === "UNDER_VERIFICATION" && (
        <Card className="flex items-center gap-4 p-5 sm:p-6">
          {claim.verification_score !== null && (
            <ScoreRing
              score={Math.round(Number(claim.verification_score))}
              size={72}
            />
          )}
          <div>
            <h2 className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock className="size-4 text-amber-500" />
              Menunggu keputusan operator
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Jawaban verifikasimu sudah dikirim. Operator pos akan meninjau dan
              memutuskan. Kamu akan mendapat notifikasi.
            </p>
          </div>
        </Card>
      )}

      {/* Disetujui */}
      {(claim.status === "APPROVED" || claim.status === "HANDOVER") && (
        <Card className="p-5 sm:p-6">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-emerald-700">
            <PackageCheck className="size-5" />
            Klaim disetujui — ambil barangmu
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Silakan datang ke{" "}
            <strong>{pos ? pos.name : "pos serah terima"}</strong>
            {pos?.area ? ` (${pos.area})` : ""} dengan membawa identitas.
            Operator akan mengonfirmasi serah terima.
          </p>
        </Card>
      )}

      {/* Selesai */}
      {claim.status === "COMPLETED" && (
        <Card className="flex items-center gap-3 p-5 sm:p-6">
          <CheckCircle2 className="size-6 text-emerald-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Serah terima selesai
            </h2>
            <p className="text-sm text-slate-500">
              Barang sudah kembali ke pemiliknya. Terima kasih sudah memakai
              Temuin.
            </p>
          </div>
        </Card>
      )}

      {/* Ditolak */}
      {claim.status === "REJECTED" && (
        <Card className="p-5 sm:p-6">
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-rose-700">
            <XCircle className="size-5" />
            Klaim ditolak
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {claim.operator_note
              ? `Catatan operator: ${claim.operator_note}`
              : "Operator menilai bukti kepemilikan belum meyakinkan."}
          </p>
        </Card>
      )}

      {/* Sudah kirim verifikasi tapi masih SUBMITTED untuk finder view */}
      {!isClaimant && claim.status === "SUBMITTED" && (
        <Card className="flex items-center gap-3 p-5 sm:p-6">
          <Clock className="size-5 text-slate-400" />
          <p className="text-sm text-slate-500">
            Pengklaim sedang mengisi bukti kepemilikan. Operator yang akan
            memutuskan — kamu tidak perlu melakukan apa pun.
          </p>
        </Card>
      )}

      {verification && !isClaimant && (
        <p className="text-center text-xs text-slate-400">
          Verifikasi ditinjau oleh operator di konsol pos.
        </p>
      )}
    </div>
  );
}
