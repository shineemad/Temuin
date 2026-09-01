import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: izinkan akses `next dev` dari perangkat lain di LAN
  // (mis. tes tampilan mobile dari HP). Tidak berpengaruh di produksi.
  allowedDevOrigins: ["192.168.1.22"],
  experimental: {
    // Batasi worker "Collecting page data" agar build tidak OOM di mesin
    // dengan RAM terbatas. Tidak memengaruhi hasil build/runtime produksi.
    cpus: 2,
  },
};

export default nextConfig;
