import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase terikat session cookie user — HANYA untuk autentikasi
 * (login, logout, ganti password). Akses data memakai client admin
 * karena semua tabel di-protect RLS deny-all.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Dipanggil dari Server Component (read-only) — aman diabaikan,
            // refresh cookie ditangani proxy.ts.
          }
        },
      },
    },
  );
}
