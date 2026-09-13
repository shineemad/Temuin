"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fieldErrorsOf, profileSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: formData.get("phone") ?? undefined,
  });
  if (!parsed.success)
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
    })
    .eq("id", user.id);
  if (error) {
    console.error("[profile] update gagal:", error);
    return { ok: false, error: "Gagal menyimpan profil." };
  }
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { ok: true, message: "Profil tersimpan." };
}

/**
 * Cek password lama lewat client sekali pakai yang tidak menulis cookie,
 * supaya session yang sedang aktif tidak ikut dirotasi/terhapus.
 */
async function isCurrentPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  // Form ini memverifikasi password, jadi tanpa limit ia bisa dipakai
  // sebagai oracle untuk menebak password lama.
  if (!rateLimit(`password:${user.id}`, 5, 10 * 60_000)) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan. Coba lagi dalam 10 menit.",
    };
  }

  const current = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current) {
    return {
      ok: false,
      fieldErrors: { current_password: "Password saat ini wajib diisi" },
    };
  }
  if (password.length < 8) {
    return {
      ok: false,
      fieldErrors: { password: "Password minimal 8 karakter" },
    };
  }
  if (password !== confirm) {
    return {
      ok: false,
      fieldErrors: { confirm: "Konfirmasi password tidak sama" },
    };
  }
  if (password === current) {
    return {
      ok: false,
      fieldErrors: { password: "Password baru harus berbeda dari yang lama" },
    };
  }

  if (!(await isCurrentPassword(user.email, current))) {
    return {
      ok: false,
      fieldErrors: { current_password: "Password saat ini salah" },
    };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[profile] ganti password gagal:", error);
    return {
      ok: false,
      error: "Gagal mengganti password. Coba login ulang lalu ulangi.",
    };
  }
  return { ok: true, message: "Password berhasil diganti." };
}
