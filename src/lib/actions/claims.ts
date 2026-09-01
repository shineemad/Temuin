"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { getMatchForUser } from "@/lib/matches";
import { setReportStatus } from "@/lib/reports";
import { notify } from "@/lib/notifications";
import {
  buildVerificationQuestions,
  evaluateVerificationAnswers,
} from "@/lib/verification";
import { rateLimit } from "@/lib/rate-limit";
import type {
  ActionResult,
  Claim,
  Conversation,
  FoundReport,
} from "@/lib/types";

async function getClaimContext(claimId: string, userId: string) {
  const db = supabaseAdmin();
  const { data: claimRaw } = await db
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (!claimRaw) return null;
  const claim = claimRaw as Claim;
  const matchCtx = await getMatchForUser(claim.match_id, userId);
  if (!matchCtx) return null;
  const isClaimant = claim.claimant_id === userId;
  const isFinder = matchCtx.found.user_id === userId;
  if (!isClaimant && !isFinder && matchCtx.role !== "admin") return null;
  return { claim, ...matchCtx, isClaimant, isFinder };
}

/** Pemilik laporan hilang mengajukan klaim atas sebuah potential match. */
export async function submitClaimAction(
  matchId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!rateLimit(`claim:${user.id}`, 10, 10 * 60_000)) {
    return { ok: false, error: "Terlalu banyak klaim dalam waktu singkat." };
  }

  const ctx = await getMatchForUser(matchId, user.id);
  if (!ctx) return { ok: false, error: "Match tidak ditemukan." };
  if (ctx.role !== "owner") {
    return {
      ok: false,
      error: "Hanya pemilik laporan kehilangan yang dapat mengajukan klaim.",
    };
  }
  if (
    ["RETURNED", "CLOSED"].includes(ctx.found.status) ||
    ["RETURNED", "CLOSED"].includes(ctx.lost.status)
  ) {
    return { ok: false, error: "Laporan pada match ini sudah tidak aktif." };
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("claims")
    .select("id")
    .eq("match_id", matchId)
    .eq("claimant_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/claims/${existing.id}`);

  const { data: inserted, error } = await db
    .from("claims")
    .insert({ match_id: matchId, claimant_id: user.id, status: "SUBMITTED" })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("[claim] insert gagal:", error);
    return { ok: false, error: "Gagal membuat klaim. Coba lagi." };
  }

  await Promise.all([
    setReportStatus("LOST", ctx.lost.id, "CLAIMED", "Klaim diajukan"),
    setReportStatus("FOUND", ctx.found.id, "CLAIMED", "Ada klaim masuk"),
    notify(
      ctx.found.user_id,
      "CLAIM_SUBMITTED",
      "Klaim baru masuk",
      `Seseorang mengklaim sebagai pemilik "${ctx.found.item_name}" yang Anda temukan. Sistem sedang memverifikasi.`,
      `/claims/${inserted.id}`,
    ),
  ]);

  revalidatePath("/claims");
  redirect(`/claims/${inserted.id}`);
}

/** Claimant menjawab pertanyaan verifikasi kepemilikan. */
export async function submitVerificationAction(
  claimId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!rateLimit(`verify:${user.id}`, 8, 10 * 60_000)) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan verifikasi. Tunggu beberapa menit.",
    };
  }

  const ctx = await getClaimContext(claimId, user.id);
  if (!ctx) return { ok: false, error: "Klaim tidak ditemukan." };
  if (!ctx.isClaimant)
    return {
      ok: false,
      error: "Hanya pengklaim yang dapat mengisi verifikasi.",
    };
  if (ctx.claim.status !== "SUBMITTED") {
    return { ok: false, error: "Verifikasi untuk klaim ini sudah dikirim." };
  }

  const questions = buildVerificationQuestions(ctx.found as FoundReport);
  const answers: Record<string, string> = {};
  const fieldErrors: Record<string, string> = {};
  for (const q of questions) {
    const raw = String(formData.get(`answer_${q.key}`) ?? "").trim();
    if (raw.length < 2) fieldErrors[`answer_${q.key}`] = "Jawaban wajib diisi";
    else if (raw.length > 500)
      fieldErrors[`answer_${q.key}`] = "Jawaban terlalu panjang";
    answers[q.key] = raw.slice(0, 500);
  }
  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const evaluation = await evaluateVerificationAnswers(
    ctx.found as FoundReport,
    questions,
    answers,
  );

  const db = supabaseAdmin();
  const { error: verError } = await db.from("claim_verifications").upsert(
    {
      claim_id: claimId,
      answers,
      checks: evaluation.checks,
      score: evaluation.score,
      evaluated_by: evaluation.evaluatedBy,
    },
    { onConflict: "claim_id" },
  );
  if (verError) {
    console.error("[claim] simpan verifikasi gagal:", verError);
    return { ok: false, error: "Gagal menyimpan verifikasi. Coba lagi." };
  }

  const { data: updatedClaim, error: updError } = await db
    .from("claims")
    .update({
      status: "UNDER_VERIFICATION",
      verification_score: evaluation.score,
    })
    .eq("id", claimId)
    .eq("status", "SUBMITTED") // guard: hanya dari SUBMITTED (anti race/double submit)
    .select("id")
    .maybeSingle();
  if (updError || !updatedClaim) {
    return {
      ok: false,
      error: "Status klaim telah berubah. Silakan muat ulang halaman.",
    };
  }

  await Promise.all([
    setReportStatus(
      "LOST",
      ctx.lost.id,
      "VERIFICATION",
      "Verifikasi kepemilikan berjalan",
    ),
    setReportStatus(
      "FOUND",
      ctx.found.id,
      "VERIFICATION",
      "Verifikasi kepemilikan berjalan",
    ),
    notify(
      ctx.found.user_id,
      "CLAIM_VERIFIED",
      "Hasil verifikasi klaim siap ditinjau",
      `Verification score ${Math.round(evaluation.score)}% untuk klaim "${ctx.found.item_name}". Tinjau dan putuskan.`,
      `/claims/${claimId}`,
    ),
  ]);

  revalidatePath(`/claims/${claimId}`);
  return { ok: true, message: "Jawaban terkirim. Menunggu keputusan penemu." };
}

/** Penemu menyetujui / menolak klaim setelah melihat hasil verifikasi. */
export async function finderDecisionAction(
  claimId: string,
  decision: "approve" | "reject",
  note?: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ctx = await getClaimContext(claimId, user.id);
  if (!ctx) return { ok: false, error: "Klaim tidak ditemukan." };
  if (!ctx.isFinder)
    return {
      ok: false,
      error: "Hanya penemu yang dapat memutuskan klaim ini.",
    };
  if (!["SUBMITTED", "UNDER_VERIFICATION"].includes(ctx.claim.status)) {
    return { ok: false, error: "Klaim ini sudah diputuskan." };
  }

  const db = supabaseAdmin();
  const cleanNote = note?.trim().slice(0, 300) || null;

  if (decision === "reject") {
    const { data: rejected } = await db
      .from("claims")
      .update({ status: "REJECTED", finder_note: cleanNote })
      .eq("id", claimId)
      .in("status", ["SUBMITTED", "UNDER_VERIFICATION"]) // guard anti race
      .select("id")
      .maybeSingle();
    if (!rejected) {
      return {
        ok: false,
        error: "Status klaim telah berubah. Silakan muat ulang halaman.",
      };
    }
    await Promise.all([
      setReportStatus("LOST", ctx.lost.id, "MATCH_FOUND", "Klaim ditolak"),
      setReportStatus("FOUND", ctx.found.id, "MATCH_FOUND", "Klaim ditolak"),
      notify(
        ctx.claim.claimant_id,
        "CLAIM_REJECTED",
        "Klaim ditolak",
        `Penemu menolak klaim Anda untuk "${ctx.lost.item_name}".${cleanNote ? ` Catatan: ${cleanNote}` : ""}`,
        `/claims/${claimId}`,
      ),
    ]);
    revalidatePath(`/claims/${claimId}`);
    return { ok: true, message: "Klaim ditolak." };
  }

  // APPROVE → buka secure communication
  const { data: approved } = await db
    .from("claims")
    .update({ status: "APPROVED", finder_note: cleanNote })
    .eq("id", claimId)
    .in("status", ["SUBMITTED", "UNDER_VERIFICATION"]) // guard anti race
    .select("id")
    .maybeSingle();
  if (!approved) {
    return {
      ok: false,
      error: "Status klaim telah berubah. Silakan muat ulang halaman.",
    };
  }

  const { data: convRaw } = await db
    .from("conversations")
    .upsert(
      {
        claim_id: claimId,
        owner_id: ctx.claim.claimant_id,
        finder_id: ctx.found.user_id,
      },
      { onConflict: "claim_id" },
    )
    .select("*")
    .maybeSingle();
  const conversation = convRaw as Conversation | null;

  await Promise.all([
    setReportStatus(
      "LOST",
      ctx.lost.id,
      "HANDOVER",
      "Klaim disetujui — atur serah terima",
    ),
    setReportStatus(
      "FOUND",
      ctx.found.id,
      "HANDOVER",
      "Klaim disetujui — atur serah terima",
    ),
    notify(
      ctx.claim.claimant_id,
      "CLAIM_APPROVED",
      "Klaim disetujui!",
      `Penemu menyetujui klaim Anda untuk "${ctx.lost.item_name}". Gunakan chat aman untuk mengatur serah terima.`,
      conversation ? `/messages/${conversation.id}` : `/claims/${claimId}`,
    ),
  ]);

  revalidatePath(`/claims/${claimId}`);
  return { ok: true, message: "Klaim disetujui. Chat aman telah dibuka." };
}

/** Tandai serah terima sedang diatur (opsional, oleh kedua pihak). */
export async function markHandoverAction(
  claimId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ctx = await getClaimContext(claimId, user.id);
  if (!ctx) return { ok: false, error: "Klaim tidak ditemukan." };
  if (ctx.claim.status !== "APPROVED") {
    return { ok: false, error: "Klaim belum berstatus APPROVED." };
  }
  const { data: handover } = await supabaseAdmin()
    .from("claims")
    .update({ status: "HANDOVER" })
    .eq("id", claimId)
    .eq("status", "APPROVED") // guard anti race
    .select("id")
    .maybeSingle();
  if (!handover) {
    return {
      ok: false,
      error: "Status klaim telah berubah. Silakan muat ulang halaman.",
    };
  }
  revalidatePath(`/claims/${claimId}`);
  return { ok: true, message: "Status diubah ke serah terima." };
}

/** Penemu mengonfirmasi barang telah diserahkan → RETURNED. */
export async function completeClaimAction(
  claimId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const ctx = await getClaimContext(claimId, user.id);
  if (!ctx) return { ok: false, error: "Klaim tidak ditemukan." };
  if (!ctx.isFinder) {
    return {
      ok: false,
      error: "Hanya penemu yang dapat mengonfirmasi penyerahan barang.",
    };
  }
  if (!["APPROVED", "HANDOVER"].includes(ctx.claim.status)) {
    return { ok: false, error: "Klaim belum siap diselesaikan." };
  }

  const db = supabaseAdmin();
  const { data: completed } = await db
    .from("claims")
    .update({ status: "COMPLETED" })
    .eq("id", claimId)
    .in("status", ["APPROVED", "HANDOVER"]) // guard anti race
    .select("id")
    .maybeSingle();
  if (!completed) {
    return {
      ok: false,
      error: "Status klaim telah berubah. Silakan muat ulang halaman.",
    };
  }

  await Promise.all([
    setReportStatus(
      "LOST",
      ctx.lost.id,
      "RETURNED",
      "Barang telah kembali ke pemilik",
    ),
    setReportStatus(
      "FOUND",
      ctx.found.id,
      "RETURNED",
      "Barang telah diserahkan ke pemilik",
    ),
    notify(
      ctx.claim.claimant_id,
      "ITEM_RETURNED",
      "Barang telah kembali!",
      `"${ctx.lost.item_name}" ditandai telah dikembalikan. Selamat!`,
      `/claims/${claimId}`,
    ),
    notify(
      ctx.found.user_id,
      "ITEM_RETURNED",
      "Terima kasih sudah membantu!",
      `"${ctx.found.item_name}" telah kembali ke pemiliknya berkat Anda.`,
      `/claims/${claimId}`,
    ),
  ]);

  revalidatePath(`/claims/${claimId}`);
  revalidatePath("/reports");
  return {
    ok: true,
    message: "Barang ditandai telah dikembalikan. Terima kasih!",
  };
}
