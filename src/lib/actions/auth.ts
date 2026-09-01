"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fieldErrorsOf, loginSchema, registerSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/types";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function safeNext(raw: unknown): string {
  if (typeof raw !== "string") return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 8, 10 * 60_000)) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi.",
    };
  }

  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { full_name, email, password } = parsed.data;

  try {
    const admin = supabaseAdmin();
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createError) {
      const msg = createError.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return {
          ok: false,
          fieldErrors: { email: "Email sudah terdaftar. Silakan login." },
        };
      }
      console.error("[auth] createUser gagal:", createError);
      return { ok: false, error: "Registrasi gagal. Coba lagi." };
    }

    const supabase = await createSupabaseServer();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return {
        ok: false,
        error:
          "Akun dibuat, tetapi login otomatis gagal. Silakan login manual.",
      };
    }
  } catch (err) {
    console.error("[auth] register error:", err);
    return {
      ok: false,
      error:
        err instanceof Error && err.message.includes("Konfigurasi")
          ? err.message
          : "Terjadi kesalahan server. Periksa koneksi lalu coba lagi.",
    };
  }

  redirect("/dashboard");
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`login:${ip}`, 15, 10 * 60_000)) {
    return {
      ok: false,
      error: "Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  }

  try {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      return { ok: false, error: "Email atau password salah." };
    }
  } catch (err) {
    console.error("[auth] login error:", err);
    return { ok: false, error: "Terjadi kesalahan server. Coba lagi." };
  }

  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  try {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] logout error:", err);
  }
  redirect("/");
}
