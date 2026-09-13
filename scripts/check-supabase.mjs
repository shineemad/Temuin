// Verifikasi koneksi Supabase + kesiapan schema/migrasi.
// Jalankan SETELAH mengisi .env.local:  node scripts/check-supabase.mjs
// Tidak pernah mencetak nilai secret — hanya status.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path = ".env.local") {
  const env = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    console.error("❌ .env.local tidak ditemukan. Salin dari .env.example dulu.");
    process.exit(1);
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [];
if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
if (!anon) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!service) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (missing.length) {
  console.error(`❌ Variabel belum diisi: ${missing.join(", ")}`);
  process.exit(1);
}

const db = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const REQUIRED_TABLES = ["profiles", "lost_reports", "found_reports", "claims"];
const MIGRATION_TABLES = ["pos"]; // dibuat oleh migrasi 0003

let ok = true;

for (const table of [...REQUIRED_TABLES, ...MIGRATION_TABLES]) {
  const { error } = await db.from(table).select("*", { head: true, count: "exact" });
  if (error) {
    ok = false;
    if (/does not exist|schema cache/i.test(error.message)) {
      const hint =
        table === "pos"
          ? " → jalankan supabase/migrations/0003_custody_operator.sql"
          : " → jalankan supabase/schema.sql";
      console.error(`❌ Tabel '${table}' tidak ada.${hint}`);
    } else {
      console.error(`❌ Query '${table}' gagal: ${error.message}`);
    }
  } else {
    console.log(`✅ Tabel '${table}' OK`);
  }
}

// Cek kolom custody hasil migrasi 0003.
const { error: custodyErr } = await db
  .from("found_reports")
  .select("custody_status", { head: true });
if (custodyErr) {
  ok = false;
  console.error(
    "❌ Kolom custody belum ada → jalankan supabase/migrations/0003_custody_operator.sql",
  );
} else {
  console.log("✅ Kolom custody (migrasi 0003) OK");
}

console.log(
  ok
    ? "\n🎉 Supabase siap. Jalankan: npm run dev, lalu /api/dev/seed?secret=<SEED_SECRET>"
    : "\n⚠️  Ada yang perlu diperbaiki di atas sebelum menjalankan app.",
);
process.exit(ok ? 0 : 1);
