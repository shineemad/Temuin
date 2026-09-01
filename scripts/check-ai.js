/* eslint-disable @typescript-eslint/no-require-imports */
// Skrip diagnosa dev: status AI analysis per laporan (jalankan: node scripts/check-ai.js)
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envText = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [
      l.slice(0, l.indexOf("=")),
      l.slice(l.indexOf("=") + 1).trim(),
    ]),
);

const { createClient } = require(
  path.join(root, "node_modules", "@supabase/supabase-js"),
);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

(async () => {
  const { data, error } = await db
    .from("ai_analysis")
    .select("lost_report_id,found_report_id,source,status,error,embedding");
  if (error) {
    console.log("ERR:", error.message);
    return;
  }
  for (const a of data) {
    const id = (a.lost_report_id || a.found_report_id).slice(0, 8);
    const emb = Array.isArray(a.embedding) ? `${a.embedding.length}d` : "NULL";
    console.log(
      `${id} | src=${a.source} | status=${a.status} | emb=${emb} | err=${a.error || "-"}`,
    );
  }
})();
