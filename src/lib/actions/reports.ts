"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import {
  fieldErrorsOf,
  foundReportSchema,
  lostReportSchema,
} from "@/lib/validation";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  STORAGE_BUCKET,
} from "@/lib/constants";
import {
  processNewReport,
  processReportAI,
  runMatchingForReport,
} from "@/lib/matching/run";
import {
  addStatusHistory,
  getFoundReport,
  getLostReport,
  setReportStatus,
} from "@/lib/reports";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult, ReportType } from "@/lib/types";

// Header biner asli tiap format — dipakai menggantikan `file.type`, yang
// dikirim browser dan gampang dipalsukan lewat request manual.
const IMAGE_SIGNATURES = [
  { mime: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  {
    mime: "image/png",
    ext: "png",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { mime: "image/webp", ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
] as const;

function detectImage(buffer: Buffer) {
  for (const sig of IMAGE_SIGNATURES) {
    if (!sig.magic.every((byte, i) => buffer[i] === byte)) continue;
    // RIFF juga dipakai WAV/AVI, jadi WebP perlu cek penanda kedua.
    if (
      sig.mime === "image/webp" &&
      buffer.subarray(8, 12).toString("ascii") !== "WEBP"
    ) {
      continue;
    }
    return sig;
  }
  return null;
}

async function uploadImage(
  file: File,
  type: ReportType,
  reportId: string,
): Promise<{ path: string } | { error: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Ukuran foto maksimal 5MB." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: "Format foto harus JPG, PNG, atau WebP." };
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const detected = detectImage(raw);
  if (!detected) {
    return { error: "File ini bukan gambar JPG, PNG, atau WebP yang valid." };
  }

  // Encode ulang agar metadata (termasuk koordinat GPS di EXIF) hilang dan
  // isi file dipastikan benar-benar bisa didecode sebagai gambar.
  let clean: Buffer;
  try {
    const pipeline = sharp(raw, { failOn: "error" })
      .rotate() // terapkan orientasi EXIF sebelum tag-nya ikut terbuang
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      });
    clean = await (
      detected.mime === "image/png"
        ? pipeline.png()
        : detected.mime === "image/webp"
          ? pipeline.webp()
          : pipeline.jpeg({ quality: 82 })
    ).toBuffer();
  } catch (err) {
    console.error("[upload] gambar gagal diproses:", err);
    return { error: "Foto tidak bisa diproses. Coba unggah foto lain." };
  }

  const path = `${type.toLowerCase()}/${reportId}/${crypto.randomUUID()}.${detected.ext}`;
  const { error } = await supabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .upload(path, clean, { contentType: detected.mime, upsert: false });
  if (error) {
    console.error("[upload] gagal:", error);
    return { error: "Upload foto gagal. Coba lagi atau kirim tanpa foto." };
  }
  return { path };
}

function pickReportFields(
  formData: FormData,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = formData.get(key) ?? undefined;
  return out;
}

const BASE_KEYS = [
  "item_name",
  "category",
  "color",
  "brand",
  "model",
  "material",
  "description",
  "unique_features",
  "location_name",
  "latitude",
  "longitude",
];

export async function createLostReportAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!rateLimit(`report:${user.id}`, 10, 10 * 60_000)) {
    return {
      ok: false,
      error:
        "Terlalu banyak laporan dalam waktu singkat. Tunggu beberapa menit.",
    };
  }

  const parsed = lostReportSchema.safeParse({
    ...pickReportFields(formData, BASE_KEYS),
    lost_date: formData.get("lost_date"),
    lost_time: formData.get("lost_time") ?? undefined,
  });
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const db = supabaseAdmin();
  const { data: inserted, error } = await db
    .from("lost_reports")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("[report] insert lost gagal:", error);
    return { ok: false, error: "Gagal menyimpan laporan. Coba lagi." };
  }
  const reportId = inserted.id as string;
  await addStatusHistory(
    "LOST",
    reportId,
    "ACTIVE",
    "Laporan kehilangan dibuat",
  );

  // Foto opsional — kegagalan upload tidak menggagalkan laporan.
  let imageWarning: string | undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(file, "LOST", reportId);
    if ("path" in result) {
      await db
        .from("lost_reports")
        .update({ image_url: result.path })
        .eq("id", reportId);
      await db.from("report_images").insert({
        lost_report_id: reportId,
        storage_path: result.path,
        mime_type: file.type,
      });
    } else {
      imageWarning = result.error;
    }
  }

  // AI + matching berjalan SETELAH response terkirim (non-blocking untuk user).
  // Baris ai_analysis PENDING dibuat dulu agar halaman detail menampilkan
  // status "sedang dianalisis" dan tombol Retry tetap berfungsi.
  await db
    .from("ai_analysis")
    .insert({ lost_report_id: reportId, status: "PENDING" })
    .select("id")
    .maybeSingle();
  after(async () => {
    try {
      await processNewReport("LOST", reportId);
    } catch (err) {
      console.error("[report] AI pipeline gagal:", err);
    }
  });

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect(
    `/reports/${reportId}?t=lost&created=1${imageWarning ? "&imgfail=1" : ""}`,
  );
}

export async function createFoundReportAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!rateLimit(`report:${user.id}`, 10, 10 * 60_000)) {
    return {
      ok: false,
      error:
        "Terlalu banyak laporan dalam waktu singkat. Tunggu beberapa menit.",
    };
  }

  const parsed = foundReportSchema.safeParse({
    ...pickReportFields(formData, BASE_KEYS),
    found_date: formData.get("found_date"),
    found_time: formData.get("found_time") ?? undefined,
    private_verification_info: formData.get("private_verification_info"),
  });
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const db = supabaseAdmin();
  const { data: inserted, error } = await db
    .from("found_reports")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("[report] insert found gagal:", error);
    return { ok: false, error: "Gagal menyimpan laporan. Coba lagi." };
  }
  const reportId = inserted.id as string;
  await addStatusHistory(
    "FOUND",
    reportId,
    "ACTIVE",
    "Laporan penemuan dibuat",
  );

  let imageWarning: string | undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(file, "FOUND", reportId);
    if ("path" in result) {
      await db
        .from("found_reports")
        .update({ image_url: result.path })
        .eq("id", reportId);
      await db.from("report_images").insert({
        found_report_id: reportId,
        storage_path: result.path,
        mime_type: file.type,
      });
    } else {
      imageWarning = result.error;
    }
  }

  // AI + matching berjalan SETELAH response terkirim (non-blocking untuk user).
  await db
    .from("ai_analysis")
    .insert({ found_report_id: reportId, status: "PENDING" })
    .select("id")
    .maybeSingle();
  after(async () => {
    try {
      await processNewReport("FOUND", reportId);
    } catch (err) {
      console.error("[report] AI pipeline gagal:", err);
    }
  });

  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect(
    `/reports/${reportId}?t=found&created=1${imageWarning ? "&imgfail=1" : ""}`,
  );
}

/** Jalankan ulang AI analysis + matching (mis. saat Gemini sempat gagal). */
export async function retryAiAction(
  type: ReportType,
  reportId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (!rateLimit(`retry-ai:${user.id}`, 6, 5 * 60_000)) {
    return {
      ok: false,
      error: "Terlalu sering. Tunggu sebentar lalu coba lagi.",
    };
  }
  const report =
    type === "LOST"
      ? await getLostReport(reportId)
      : await getFoundReport(reportId);
  if (!report || report.user_id !== user.id) {
    return { ok: false, error: "Laporan tidak ditemukan." };
  }
  await processReportAI(type, reportId);
  const summary = await runMatchingForReport(type, reportId);
  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/matches");
  return {
    ok: true,
    message:
      summary.saved > 0
        ? `Analisis selesai — ${summary.saved} potential match ditemukan.`
        : "Analisis selesai — belum ada match. Kami akan terus memantau laporan baru.",
  };
}

/** Tutup laporan (mis. barang sudah ketemu sendiri). */
export async function closeReportAction(
  type: ReportType,
  reportId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  const report =
    type === "LOST"
      ? await getLostReport(reportId)
      : await getFoundReport(reportId);
  if (!report || report.user_id !== user.id) {
    return { ok: false, error: "Laporan tidak ditemukan." };
  }
  if (report.status === "RETURNED" || report.status === "CLOSED") {
    return { ok: false, error: "Laporan sudah selesai." };
  }
  await setReportStatus(type, reportId, "CLOSED", "Ditutup oleh pelapor");
  revalidatePath(`/reports/${reportId}`);
  revalidatePath("/reports");
  return { ok: true };
}
