import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Host Supabase perlu di-allowlist: browser memanggil REST/Auth/Realtime
// langsung, dan /api/images me-redirect ke signed URL di domain storage.
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

const csp = [
  "default-src 'self'",
  // Next.js menyuntik inline bootstrap script; 'unsafe-eval' hanya dibutuhkan
  // HMR Turbopack saat dev.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    supabaseOrigin,
    supabaseOrigin.replace(/^https:/, "wss:"),
    isDev ? "ws: http://localhost:*" : "",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Dev only: izinkan akses `next dev` dari perangkat lain di LAN
  // (mis. tes tampilan mobile dari HP). Tidak berpengaruh di produksi.
  allowedDevOrigins: ["192.168.1.22"],
  experimental: {
    // Batasi worker "Collecting page data" agar build tidak OOM di mesin
    // dengan RAM terbatas. Tidak memengaruhi hasil build/runtime produksi.
    cpus: 2,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
