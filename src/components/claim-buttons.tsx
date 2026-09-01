"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { ConfirmActionButton } from "@/components/confirm-dialog";
import { submitClaimAction } from "@/lib/actions/claims";

export function SubmitClaimButton({ matchId }: { matchId: string }) {
  const router = useRouter();

  return (
    <ConfirmActionButton
      title="Ajukan klaim kepemilikan?"
      description="Anda akan diminta menjawab beberapa pertanyaan tentang barang ini. Jawaban dibandingkan dengan informasi privat dari penemu — pastikan Anda pemilik sebenarnya. Klaim palsu dapat ditolak."
      confirmLabel="Ajukan Klaim"
      variant="primary"
      size="lg"
      className="w-full"
      action={async () => {
        const result = await submitClaimAction(matchId);
        // Saat sukses, action melakukan redirect — kode di bawah hanya berjalan bila gagal.
        if (result && !result.ok) {
          toast.error(result.error ?? "Gagal mengajukan klaim.");
        } else {
          router.refresh();
        }
      }}
    >
      <ShieldCheck className="size-4.5" />
      Ajukan Klaim
    </ConfirmActionButton>
  );
}
