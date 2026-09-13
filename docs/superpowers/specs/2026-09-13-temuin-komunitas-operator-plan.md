# Rencana Implementasi — Temuin Komunitas + Operator (MVP)

Spec: [2026-09-13-temuin-komunitas-operator-design.md](2026-09-13-temuin-komunitas-operator-design.md)

Dikerjakan sebagai milestone kecil. **Setiap milestone diakhiri** dengan
`tsc --noEmit` + `eslint` (+ `vitest` bila ada test) yang bersih, lalu commit terpisah.

## Kendala verifikasi

`.env.local` belum berisi kredensial Supabase, jadi alur end-to-end (auth, DB, storage)
**tidak bisa** diuji lokal. Yang bisa diverifikasi otomatis: TypeScript, ESLint,
`next build`, dan unit test fungsi murni (matching, verifikasi, custody, serializer).
Uji alur nyata dilakukan pengguna setelah mengisi kredensial.

## Milestone

### M0 — Tooling & test harness

- Commit paket yang sudah terpasang (vitest, prettier, husky, lint-staged)
- `vitest.config.ts`, `.prettierrc`, `.husky/pre-commit` + `lint-staged`
- Script npm: `test`, `typecheck`, `format`
- **Verif:** `vitest` jalan (0 test dulu tak apa), `tsc`, `eslint`

### M1 — Model data & migrasi

- `supabase/migrations/0003_custody_operator.sql`: tabel `pos`, kolom custody di
  `found_reports`, field operator di `claims`, RLS deny-all, 2 pos demo
- `src/lib/types.ts`: `Pos`, kolom custody di `FoundReport`, field operator di `Claim`
- **Verif:** `tsc`

### M2 — Perubahan engine + unit test

- `src/lib/matching/engine.ts`: nonaktifkan `image_score`
- Test: normalisasi bobot matching, `image_score` nonaktif, pemetaan verdict→skor
  verifikasi, state machine custody
- **Verif:** `vitest` hijau

### M3 — Lib custody/pos + aksi operator

- `src/lib/pos.ts`, `src/lib/custody.ts` (transisi tervalidasi)
- `src/lib/actions/operator.ts`: terima barang, putus klaim, konfirmasi serah terima
- **Verif:** `tsc`, unit test transisi

### M4 — Zona publik

- Landing feed (`page.tsx`), `/cari`, `/barang/[id]` (+ serializer yang membuang field
  sensitif), `/lapor/hilang` & `/lapor/temuan` (login-saat-submit), `error.tsx` +
  `loading.tsx` publik
- **Verif:** `next build`

### M5 — Restrukturisasi zona login

- `/saya` gantikan `/dashboard`; `/klaim` jadi alur claimant-menjawab; nav app-shell
  diperbarui; redirect lama→baru di `src/proxy.ts`
- **Verif:** `next build`

### M6 — Konsol operator `/pos`

- Tiga antrean (Terima, Verifikasi, Serah terima)
- Panel co-pilot verifikasi (pakai ulang `verification.ts` + `score-breakdown.tsx`)
- **Verif:** `next build`

### M7 — Pangkas chat + cleanup rute

- Lepas entry point chat (nav, pembuatan conversation saat approve)
- Hapus/redirect `/admin`, `/impact`, `/matches/*`, `/reports/*`, `/report/*`
- **Verif:** `next build`, tak ada link mati

### M8 — Seed demo + verifikasi akhir

- `/api/dev/seed`: buat `pos` + barang `IN_CUSTODY` + klaim menunggu verifikasi operator
- **Verif:** `next build` + `vitest` penuh; siap uji manual setelah kredensial diisi

## Checkpoint

Milestone M4–M7 menghapus/memindah rute (sulit dibatalkan). Setelah M0–M3 (fondasi yang
aman & terverifikasi) selesai, minta konfirmasi pengguna sebelum lanjut ke restrukturisasi
besar.
