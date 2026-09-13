"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import {
  confirmHandoverAction,
  decideClaimAction,
  receiveItemAction,
} from "@/lib/actions/operator";

export function ReceiveButton({ foundId }: { foundId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await receiveItemAction(foundId);
          if (r.ok) toast.success(r.message ?? "Barang diterima.");
          else toast.error(r.error ?? "Gagal.");
          router.refresh();
        })
      }
    >
      <PackageCheck className="size-4" />
      Barang diterima
    </Button>
  );
}

export function DecideClaimForm({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function decide(decision: "approve" | "reject") {
    start(async () => {
      const r = await decideClaimAction(claimId, decision, note);
      if (r.ok) toast.success(r.message ?? "Tersimpan.");
      else toast.error(r.error ?? "Gagal memproses.");
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <Textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan keputusan (opsional) — mis. alasan menolak, atau catatan serah terima."
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          loading={pending}
          onClick={() => decide("approve")}
        >
          <ThumbsUp className="size-4" />
          Setujui klaim
        </Button>
        <Button
          variant="danger-outline"
          loading={pending}
          onClick={() => decide("reject")}
        >
          <ThumbsDown className="size-4" />
          Tolak
        </Button>
      </div>
    </div>
  );
}

export function HandoverButton({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await confirmHandoverAction(claimId);
          if (r.ok) toast.success(r.message ?? "Serah terima selesai.");
          else toast.error(r.error ?? "Gagal.");
          router.refresh();
        })
      }
    >
      <PackageCheck className="size-4" />
      Sudah diambil pemilik
    </Button>
  );
}
