import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/saya",
  "/klaim",
  "/pos",
  "/dashboard",
  "/report",
  "/reports",
  "/matches",
  "/claims",
  "/notifications",
  "/impact",
  "/profile",
  "/messages",
  "/admin",
];

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Env belum dikonfigurasi → biarkan lewat; halaman terproteksi tetap
  // menolak lewat requireUser().
  if (!url || !anonKey) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Refresh session bila perlu + ambil user terverifikasi.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // Rute lama diarahkan ke struktur baru.
  if (user && (path === "/dashboard" || path === "/reports")) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/saya";
    dest.search = "";
    return NextResponse.redirect(dest);
  }
  if (user && path === "/claims") {
    const dest = request.nextUrl.clone();
    dest.pathname = "/klaim";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  if (user && (path === "/login" || path === "/register")) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/saya";
    dashUrl.search = "";
    return NextResponse.redirect(dashUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
