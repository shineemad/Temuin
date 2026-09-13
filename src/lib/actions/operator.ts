"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMatchForUser } from "@/lib/matches";
import { getFoundReport, setReportStatus } from "@/lib/reports";
import { notify } from "@/lib/notifications";
import { getPos } from "@/lib/pos";
import { receiveFoundItem, releaseFoundItem } from "@/lib/custody";
import type { ActionResult, Claim } from "@/lib/types";

async function loadClaim(claimId: string): Promise<Claim | null> {
  const { data } = await supabaseAdmin()
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  return (data as Claim | null) ?? null;
}

/** Operator mencatat barang temuan diterima di pos: AWAITING → IN_CUSTODY. */
export async function receiveItemAction(
  foundId: string,
): Promise<ActionResult> {
  const operator = await requireAdmin();
  const found = await getFoundReport(foundId);
  if (!found) return { ok: false, error: "Laporan tidak ditemukan." };
  if (found.holding !== "POS")
    return { ok: false, error: "Barang ini tidak dititipkan ke pos." };
  if (found.custody_status !== "AWAITING")
    return { ok: false, error: "Barang ini sudah tercatat diterima." };

  const ok = await receiveFoundItem(foundId, operator.id);
  if (!ok)
    return {
      ok: false,
      error: "Status barang telah berubah. Muat ulang halaman.",
    };

  await notify(
    found.user_id,
    "SYSTEM",
    "Barang diterima pos",
    `"${found.item_name}" sudah diterima dan dititipkan di pos. Terima kasih.`,
    `/barang/${foundId}`,
  );
  revalidatePath("/pos");
  return { ok: true, message: "Barang tercatat diterima." };
}

/** Operator memutuskan klaim (dibantu co-pilot AI) setelah verifikasi. */
export async function decideClaimAction(
  claimId: string,
  decision: "approve" | "reject",
  note?: string,
): Promise<ActionResult> {
  const operator = await requireAdmin();
  const claim = await loadClaim(claimId);
  if (!claim) return { ok: false, error: "Klaim tidak ditemukan." };
  if (claim.status !== "UNDER_VERIFICATION")
    return {
      ok: false,
      error: "Klaim ini belum siap diputuskan atau sudah diproses.",
    };

  const ctx = await getMatchForUser(claim.match_id, operator.id);
  if (!ctx) return { ok: false, error: "Data match tidak ditemukan." };

  const db = supabaseAdmin();
  const cleanNote = note?.trim().slice(0, 300) || null;
  const now = new Date().toISOString();

  const { data: updated } = await db
    .from("claims")
    .update({
      status: decision === "approve" ? "APPROVED" : "REJECTED",
      reviewed_by: operator.id,
      reviewed_at: now,
      operator_note: cleanNote,
    })
    .eq("id", claimId)
    .eq("status", "UNDER_VERIFICATION") // guard anti race / double decide
    .select("id")
    .maybeSingle();
  if (!updated)
    return {
      ok: false,
      error: "Status klaim telah berubah. Muat ulang halaman.",
    };

  if (decision === "reject") {
    await Promise.all([
      setReportStatus(
        "LOST",
        ctx.lost.id,
        "MATCH_FOUND",
        "Klaim ditolak operator",
      ),
      setReportStatus(
        "FOUND",
        ctx.found.id,
        "MATCH_FOUND",
        "Klaim ditolak operator",
      ),
      notify(
        claim.claimant_id,
        "CLAIM_REJECTED",
        "Klaim ditolak",
        `Operator menolak klaim Anda atas "${ctx.lost.item_name}".${cleanNote ? ` Catatan: ${cleanNote}` : ""}`,
        `/klaim/${claimId}`,
      ),
    ]);
    revalidatePath("/pos");
    revalidatePath(`/klaim/${claimId}`);
    return { ok: true, message: "Klaim ditolak." };
  }

  const pos = ctx.found.pos_id ? await getPos(ctx.found.pos_id) : null;
  const posLabel = pos ? ` di ${pos.name}` : "";
  await Promise.all([
    setReportStatus(
      "LOST",
      ctx.lost.id,
      "HANDOVER",
      "Klaim disetujui operator",
    ),
    setReportStatus(
      "FOUND",
      ctx.found.id,
      "HANDOVER",
      "Klaim disetujui operator",
    ),
    notify(
      claim.claimant_id,
      "CLAIM_APPROVED",
      "Klaim disetujui",
      `Klaim Anda atas "${ctx.lost.item_name}" disetujui. Silakan ambil barang${posLabel} dengan membawa identitas.`,
      `/klaim/${claimId}`,
    ),
  ]);
  revalidatePath("/pos");
  revalidatePath(`/klaim/${claimId}`);
  return { ok: true, message: "Klaim disetujui." };
}

/** Operator mengonfirmasi barang sudah diserahkan ke pemilik. */
export async function confirmHandoverAction(
  claimId: string,
): Promise<ActionResult> {
  const operator = await requireAdmin();
  const claim = await loadClaim(claimId);
  if (!claim) return { ok: false, error: "Klaim tidak ditemukan." };
  if (claim.status !== "APPROVED")
    return {
      ok: false,
      error: "Klaim ini belum disetujui atau sudah selesai.",
    };

  const ctx = await getMatchForUser(claim.match_id, operator.id);
  if (!ctx) return { ok: false, error: "Data match tidak ditemukan." };

  const db = supabaseAdmin();
  const { data: updated } = await db
    .from("claims")
    .update({ status: "COMPLETED" })
    .eq("id", claimId)
    .eq("status", "APPROVED") // guard anti race
    .select("id")
    .maybeSingle();
  if (!updated)
    return {
      ok: false,
      error: "Status klaim telah berubah. Muat ulang halaman.",
    };

  if (ctx.found.holding === "POS") await releaseFoundItem(ctx.found.id);
  await Promise.all([
    setReportStatus("LOST", ctx.lost.id, "RETURNED", "Barang diterima pemilik"),
    setReportStatus(
      "FOUND",
      ctx.found.id,
      "RETURNED",
      "Barang diserahkan ke pemilik",
    ),
    notify(
      claim.claimant_id,
      "ITEM_RETURNED",
      "Barang telah diserahkan",
      `Serah terima "${ctx.lost.item_name}" selesai. Semoga membantu!`,
      `/klaim/${claimId}`,
    ),
  ]);
  revalidatePath("/pos");
  revalidatePath(`/klaim/${claimId}`);
  return { ok: true, message: "Serah terima selesai." };
}
