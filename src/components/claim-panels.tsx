"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, PackageCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button, Card, FieldError, Label, Textarea } from "@/components/ui";
import { ConfirmActionButton } from "@/components/confirm-dialog";
import {
  completeClaimAction,
  finderDecisionAction,
  markHandoverAction,
  submitVerificationAction,
} from "@/lib/actions/claims";
import type { ActionResult } from "@/lib/types";
import type { VerificationQuestion } from "@/lib/verification";

/** Form pertanyaan verifikasi kepemilikan (diisi claimant). */
export function VerificationForm({
  claimId,
  questions,
}: {
  claimId: string;
  questions: VerificationQuestion[];
}) {
  const router = useRouter();
  const boundAction = submitVerificationAction.bind(null, claimId);
  const [state, formAction, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message ?? "Jawaban verifikasi terkirim.");
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.key}>
          <Label htmlFor={`answer_${q.key}`}>
            {i + 1}. {q.question}
          </Label>
          <Textarea
            id={`answer_${q.key}`}
            name={`answer_${q.key}`}
            rows={2}
            placeholder={q.placeholder}
            required
          />
          <FieldError error={state?.fieldErrors?.[`answer_${q.key}`]} />
        </div>
      ))}
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200">
        Jawaban Anda dibandingkan secara otomatis dengan informasi privat dari
        penemu. Anda tidak dapat melihat informasi penemu — jawab sejujur dan
        sedetail mungkin.
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {pending
          ? "AI sedang mengevaluasi jawaban…"
          : "Kirim Jawaban Verifikasi"}
      </Button>
    </form>
  );
}

/** Panel keputusan penemu: approve / reject. */
export function FinderDecisionPanel({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

  async function decide(decision: "approve" | "reject") {
    setLoading(decision);
    try {
      const result: ActionResult = await finderDecisionAction(
        claimId,
        decision,
        note,
      );
      if (result.ok) {
        toast.success(result.message ?? "Keputusan tersimpan.");
        router.refresh();
      } else {
        toast.error(result.error ?? "Gagal menyimpan keputusan.");
      }
    } catch {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="text-sm font-bold tracking-wide text-slate-900 uppercase">
        Keputusan Anda
      </h3>
      <p className="mt-1 mb-3 text-xs leading-relaxed text-slate-500">
        Sistem hanya memberi rekomendasi — keputusan akhir ada di tangan Anda
        sebagai penemu.
      </p>
      <Textarea
        rows={2}
        placeholder="Catatan untuk pengklaim (opsional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={300}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          variant="danger-outline"
          onClick={() => decide("reject")}
          loading={loading === "reject"}
          disabled={loading !== null}
        >
          <ThumbsDown className="size-4" />
          Tolak
        </Button>
        <Button
          onClick={() => decide("approve")}
          loading={loading === "approve"}
          disabled={loading !== null}
        >
          <ThumbsUp className="size-4" />
          Setujui Klaim
        </Button>
      </div>
    </Card>
  );
}

export function MarkHandoverButton({ claimId }: { claimId: string }) {
  const router = useRouter();
  return (
    <ConfirmActionButton
      title="Tandai serah terima sedang diatur?"
      description="Gunakan setelah Anda dan pihak lain sepakat waktu & tempat penyerahan lewat chat."
      confirmLabel="Ya, tandai"
      variant="secondary"
      size="md"
      className="w-full"
      action={async () => {
        const result = await markHandoverAction(claimId);
        if (result.ok) {
          toast.success(result.message ?? "Status diperbarui.");
          router.refresh();
        } else {
          toast.error(result.error ?? "Gagal memperbarui status.");
        }
      }}
    >
      <PackageCheck className="size-4" />
      Serah Terima Diatur
    </ConfirmActionButton>
  );
}

export function CompleteClaimButton({ claimId }: { claimId: string }) {
  const router = useRouter();
  return (
    <ConfirmActionButton
      title="Konfirmasi barang sudah diserahkan?"
      description="Status laporan akan berubah menjadi RETURNED dan proses klaim selesai. Aksi ini tidak dapat dibatalkan."
      confirmLabel="Ya, barang sudah diserahkan"
      variant="primary"
      size="md"
      className="w-full"
      action={async () => {
        const result = await completeClaimAction(claimId);
        if (result.ok) {
          toast.success(
            result.message ?? "Klaim selesai — barang kembali ke pemilik!",
          );
          router.refresh();
        } else {
          toast.error(result.error ?? "Gagal menyelesaikan klaim.");
        }
      }}
    >
      <CheckCircle2 className="size-4" />
      Konfirmasi Barang Diserahkan
    </ConfirmActionButton>
  );
}
