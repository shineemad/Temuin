"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
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

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
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
