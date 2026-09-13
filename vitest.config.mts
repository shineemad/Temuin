import { defineConfig } from "vitest/config";

// Target test = fungsi murni (matching, verifikasi, custody, serializer),
// jadi environment node sudah cukup — tak perlu jsdom.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
