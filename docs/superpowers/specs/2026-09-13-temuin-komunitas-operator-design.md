# Temuin — Redesain jadi Lost & Found Komunitas Berbatas dengan Operator (AI di depan)

**Tanggal:** 2026-09-13
**Status:** Disetujui (menunggu review spec)

## Ringkasan

Temuin diubah dari aplikasi bergaya SaaS (semua di balik login, berpusat dashboard)
menjadi **lost & found untuk komunitas berbatas** (institusi atau kota) dengan
**operator/pengelola** sebagai penengah dan **titik serah terima (pos)** terpercaya.
Platform ini **gratis**.

Perubahan besar dibanding versi sekarang:

- **Dinding login digeser.** Publik bisa melihat feed, mencari, membuka detail, dan
  melapor — tanpa akun. Login menjadi konsekuensi melapor, bukan syarat.
- **Dashboard dihapus**, diganti "Laporan Saya" (daftar sederhana).
- **Operator memutuskan klaim**, dibantu AI. Penemu selesai begitu barang diserahkan
  ke pos.
- **AI ditonjolkan lewat visibilitas & penjelasan, bukan otonomi.** Manusia (operator)
  tetap memegang keputusan akhir.

## Keputusan yang mengunci desain

| Topik | Keputusan |
|---|---|
| Target | Komunitas berbatas: institusi **dan** kota (opsi B+C) |
| Model serah terima | **Hybrid**; MVP mulai dari jalur "meja fisik" untuk barang berharga |
| Peran operator | **Satu pengelola** untuk MVP (pakai ulang role `admin`) |
| Arsitektur akses | **Dua permukaan**: situs publik + area terautentikasi |
| Peran AI | **Asisten yang ditonjolkan** — pintar & transparan, operator memutuskan |
| Pahlawan AI | **Co-pilot verifikasi operator** |
| Pendukung AI | **Pencocokan yang bisa dijelaskan** |
| Dipangkas dari MVP | Chat antar warga, analisis gambar sebagai sinyal matching |

## Prinsip

- **YAGNI.** Manfaatkan tabel, status, dan mesin AI yang sudah ada. Tambah seminimal
  mungkin.
- **AI jujur.** Jangkar kepercayaan adalah operator; AI mempercepat, bukan menghakimi.
- **Aman untuk demo live.** Setiap jalur AI punya fallback non-AI yang tetap
  menghasilkan output.

---

## 1. Model akses & struktur route (Pendekatan 2: dua permukaan)

Tiga zona.

**Zona publik** (tanpa login, tanpa app-shell):

| Route | Isi | Asal |
|---|---|---|
| `/` | Landing + feed barang terbaru | rombak `src/app/page.tsx` |
| `/cari` | Browse + filter (kategori, pos, status) | baru |
| `/barang/[id]` | Detail barang publik, tanpa data sensitif | baru (turunan `reports/[id]`) |
| `/lapor/hilang`, `/lapor/temuan` | Form lapor | pindah dari `report/*` |

**Zona login** (app-shell, tanpa dashboard):

| Route | Isi | Asal |
|---|---|---|
| `/saya` | "Laporan Saya" — daftar sederhana | ganti `dashboard` |
| `/klaim`, `/klaim/[id]` | Proses klaim (claimant menjawab verifikasi) | `claims/*` |
| `/notifikasi`, `/profil` | Tetap | tetap |

**Zona pengelola** (khusus operator):

| Route | Isi | Asal |
|---|---|---|
| `/pos` | Konsol operator: Terima, Verifikasi, Serah terima | baru (gantikan `admin`) |

Aturan:

- **Guard pindah dari layout ke halaman.** Rute publik (`/cari`, `/barang`, `/lapor`)
  keluar dari route group `(app)` sehingga tidak dijaga `requireUser()`.
- **Form lapor publik dengan login-saat-submit.** Boleh diisi tanpa login; identitas
  diminta saat submit (login/daftar kilat), draft form dipertahankan, lalu laporan
  otomatis tertaut ke akun.
- **Detail publik menyembunyikan** `private_verification_info`, kontak, dan koordinat
  presisi (hanya nama pos/area).

---

## 2. Model data

Delta terhadap schema sekarang. Prinsip: tambah seminimal mungkin.

**Tabel baru — `pos`** (titik serah terima):

```
id, name, area, description, is_active, created_at
```

**`found_reports` — kolom custody:**

```
holding         POS | FINDER      (default POS; FINDER = jalur barang kecil, fase 2)
pos_id          fk → pos          (null jika holding = FINDER)
custody_status  AWAITING | IN_CUSTODY | RELEASED
received_by     fk → profiles     (operator yang menerima)
received_at, released_at
```

Jejak audit custody numpang di `report_status_history` yang sudah ada.

**`claims` — keputusan operator:**

```
reviewed_by     fk → profiles     (operator)
reviewed_at
operator_note   text
```

**`profiles.role`** — untuk MVP satu pengelola, `admin` yang ada dipakai ulang sebagai
operator. Tidak ada perubahan schema; nilai `operator` bisa dipecah nanti.

**Tidak berubah:** `ai_analysis`, `matches` (+ `MatchComponent[]`), `claim_verifications`
(`checks[]` + `score` + `evaluated_by`), `conversations`, `messages`, `notifications`.

Total tambahan: **1 tabel + ~9 kolom + 0 tabel dibuang.**

---

## 3. Alur inti & konsol operator

**Alur pahlawan (barang berharga, lewat pos):**

```
Penemu lapor (pilih pos)
  → Operator terima barang        [custody: AWAITING → IN_CUSTODY]
  → AI matching (skor + alasan)   [fitur pendukung B]
  → Pemilik klaim (jawab verifikasi)
  → AI evaluasi tiap jawaban
  → Operator: panel co-pilot → approve/reject   [fitur pahlawan A]
  → Pemilik ambil di pos          [custody: IN_CUSTODY → RELEASED]
```

Pergeseran kunci:

1. **Operator yang menekan approve, bukan penemu.** Verifikasi kepemilikan jadi urusan
   operator yang dibantu AI.
2. **`private_verification_info` tetap ditulis penemu** saat melapor, tapi kini dipakai
   oleh AI + operator.

**Konsol operator `/pos` — tiga antrean:**

| Tab | Isi | Aksi |
|---|---|---|
| **Terima** | Barang `AWAITING` | "Barang diterima" → `IN_CUSTODY` |
| **Verifikasi** ⭐ | Klaim menunggu keputusan | Panel co-pilot: skor + analisis tiap jawaban vs info rahasia → Approve/Reject + catatan |
| **Serah terima** | Klaim `APPROVED` | "Sudah diambil pemilik" → `RELEASED`/`RETURNED`/`COMPLETED` |

**Chat dipangkas dari alur pahlawan.** Pos jadi penengah, jadi pemilik tidak perlu
kontak penemu — identitas kedua pihak tak pernah saling terbuka. Kode chat disimpan
untuk jalur "antar warga" di fase 2.

Pemetaan status (memakai enum yang sudah ada):

- `found_report.status`: `ACTIVE → MATCH_FOUND → CLAIMED → VERIFICATION → HANDOVER → RETURNED`
- `custody_status` (jalur paralel): `AWAITING → IN_CUSTODY → RELEASED`
- `claim.status`: `SUBMITTED → UNDER_VERIFICATION → APPROVED/REJECTED → HANDOVER → COMPLETED`

---

## 4. Detail AI

### Pahlawan — Co-pilot verifikasi operator

Mesinnya sudah ada di `src/lib/verification.ts`. `evaluateVerificationAnswers()` sudah
menghasilkan, per jawaban: **verdict** (`match`/`partial`/`no_match`/`unknown`) + **note
alasan** dari Gemini, lalu **skor berbobot**, plus `verificationRecommendation()`.

Yang berubah:

1. **Penonton** — panel pindah dari penemu ke operator di tab Verifikasi `/pos`.
2. **Kata-kata** — teks rekomendasi diarahkan ke konteks operator.
3. **Keputusan tercatat** — hasil klik masuk ke `claims.reviewed_by` + `operator_note`.

Mesin skoring, pembobotan, dan pemanggilan Gemini tidak disentuh.

**Aman untuk demo live:** jika Gemini mati/timeout, `fallbackVerdict()` (kesamaan teks)
tetap mengisi verdict + skor, `evaluatedBy = "fallback"`. Co-pilot selalu menghasilkan
sesuatu.

### Pendukung — Pencocokan yang bisa dijelaskan

`matches.explanation: MatchComponent[]` sudah menyimpan 7 komponen + bobot ternormalisasi
+ alasan. Yang kurang cuma tampilan: kartu visual "kenapa cocok" (pakai ulang
`src/components/score-breakdown.tsx`) ditampilkan ke pemilik saat match dan ke operator
saat verifikasi. Nol perubahan di engine.

### Dipangkas

`image_score` dinonaktifkan dari bobot matching (mahal, sinyal tipis, operator lihat
barang fisik). Ekstraksi teks + embedding tetap jalan (punya fallback, nol biaya tanpa
API key).

---

## 5. Perubahan kode

**Migrasi baru** — `supabase/migrations/0003_custody_operator.sql`:

- `create table pos` + RLS deny-all + 2 baris pos demo
- `found_reports`: kolom custody
- `claims`: `reviewed_by`, `reviewed_at`, `operator_note`

**File baru:**

| File | Fungsi |
|---|---|
| `src/app/cari/page.tsx` | Browse + filter publik |
| `src/app/barang/[id]/page.tsx` | Detail publik (tanpa data sensitif) |
| `src/app/lapor/hilang/page.tsx`, `src/app/lapor/temuan/page.tsx` | Form lapor publik |
| `src/app/(app)/pos/page.tsx` | Konsol operator (3 antrean) |
| `src/components/operator-verify.tsx` | Panel co-pilot verifikasi (pahlawan) |
| `src/components/operator-intake.tsx`, `src/components/operator-handover.tsx` | Terima & serah terima |
| `src/lib/custody.ts`, `src/lib/pos.ts` | Transisi custody + query pos |
| `src/lib/actions/operator.ts` | Aksi: terima, putus klaim, konfirmasi serah terima |

**File diubah:**

| File | Perubahan |
|---|---|
| `src/lib/types.ts` | `Pos`, kolom custody di `FoundReport`, field operator di `Claim` |
| `src/lib/actions/reports.ts` | Lapor set `holding/pos_id`; login-saat-submit |
| `src/lib/matching/engine.ts` | Nonaktifkan `image_score` |
| `src/lib/actions/claims.ts` | Buang approval penemu; claimant hanya menjawab |
| `src/app/page.tsx` | Landing → feed publik |
| `src/components/app-shell.tsx` | Nav: buang dashboard, tambah `/saya` + `/pos` |
| `src/components/score-breakdown.tsx` | Dipakai ulang untuk visual "kenapa cocok" |

**Dihapus / dialihkan:**

- `/dashboard` → redirect `/saya`
- `/matches/*`, `/reports/*` → lebur ke `/saya` + `/barang/[id]`
- `/report/*` → pindah ke `/lapor/*` publik
- `/admin` → digantikan `/pos`
- `/impact` → dihapus dari nav (statistiknya bisa jadi seksi di landing)
- **Chat** (`/messages/*`, `src/components/chat-panel.tsx`, `src/app/api/messages/*`,
  pembuatan conversation saat approve) → dilepas dari MVP, kode tetap di repo untuk
  fase 2 tanpa entry point

---

## 6. Error handling, testing, cleanup

**Error handling:**

- Zona publik butuh `error.tsx` + `loading.tsx` sendiri (yang ada di `(app)/` tidak
  menutupinya). Supabase mati → feed publik tampil empty state, bukan crash.
- Aksi operator memvalidasi transisi: tidak bisa "terima" barang yang sudah
  `IN_CUSTODY`, tidak bisa approve klaim yang sudah diputus. Lewat `requireAdmin()` +
  balikan `ActionResult`.
- Login-saat-submit: draft form disimpan sebelum ke auth, lalu diselesaikan otomatis.
- Kebocoran data publik dicegah di query (serializer membuang field sensitif), bukan
  hanya di UI.

**Testing** (dengan `vitest` yang sudah terpasang — semua target fungsi murni):

- Matching engine: normalisasi bobot, `image_score` benar-benar nonaktif
- Verifikasi: pemetaan verdict → skor, jalur fallback
- State machine custody: transisi sah vs ditolak
- Aturan akses: detail publik menyembunyikan field sensitif

**Cleanup rute:**

- Redirect lama→baru di `src/proxy.ts` (middleware) supaya tautan lama tidak 404
- Seed demo (`/api/dev/seed`) diperbarui: buat `pos` + barang `IN_CUSTODY` + satu klaim
  yang menunggu verifikasi operator, supaya demo langsung mendarat di momen pahlawan

**Keamanan:** `pos` pakai RLS deny-all seperti tabel lain; kolom baru diakses lewat
service role server-side.

---

## Di luar cakupan MVP (fase 2)

- Jalur "antar warga" untuk barang kecil (`holding = FINDER`) + chat antar warga
- Analisis gambar (intake-assist atau sinyal matching)
- Banyak operator + penugasan per pos (role `operator` terpisah)
- Pencarian bahasa natural sebagai fitur menonjol
- Intake dari foto
