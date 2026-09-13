<div align="center">

# 🔍 TEMUIN

### _Yang Hilang, Bisa Ditemuin._

**Platform Lost & Found Bertenaga AI** — mempertemukan barang hilang dengan penemunya secara otomatis, aman, dan explainable.

Dibangun untuk **CREATHON 2026** · Tema: _AI dan Data yang Berdampak Sosial_

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini_AI-server--side_only-8E75B2?logo=googlegemini&logoColor=white)](https://ai.google.dev)

</div>

---

## 💡 Masalah & Solusi

Setiap hari ribuan barang hilang — dompet, ponsel, kunci, dokumen penting. Grup media sosial "info kehilangan" tidak efisien: laporan tenggelam, informasi sensitif terpampang publik, dan rawan klaim palsu.

**Temuin** menyelesaikannya end-to-end:

1. 🤖 **AI Matching** — mencocokkan laporan _kehilangan_ ↔ _penemuan_ dari deskripsi, atribut, ciri khusus, lokasi, dan waktu.
2. 🔐 **Verifikasi Kepemilikan** — pengklaim menjawab pertanyaan privat yang hanya diketahui pemilik asli; AI menilai jawabannya sebagai **co-pilot**, operator yang memutuskan.
3. 🏢 **Operator Pos** — barang berharga dititipkan ke pos serah terima; operator memverifikasi klaim dibantu AI lalu menyerahkan barang ke pemilik.
4. 🌐 **Feed Publik** — barang hilang & temuan bisa dilihat, dicari, dan dilaporkan siapa saja tanpa akun; login hanya diminta saat mengklaim.

> Informasi sensitif **tidak pernah** dipajang ke publik.

## ✨ Fitur Utama

| Fitur                            | Deskripsi                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 📝 Laporan Kehilangan & Penemuan | Form terstruktur + upload foto (bucket privat, signed URL)                                                        |
| 🧠 Explainable Match Score       | Skor per-komponen (deskripsi, atribut, ciri khusus, lokasi, waktu, kategori) — bukan black box                    |
| 🛡️ Verifikasi Klaim              | Pertanyaan privat + _Verification Score_ dari AI; **operator** yang memutuskan (AI sebagai co-pilot, bukan hakim) |
| 🏢 Konsol Operator `/pos`        | Tiga antrean: terima barang → verifikasi (co-pilot AI) → serah terima                                             |
| 🌐 Feed & Lapor Publik           | Lihat, cari (`/cari`), dan lapor (`/lapor`) barang tanpa akun; login hanya saat mengklaim                         |
| 🔔 Notifikasi                    | Match baru, klaim masuk, status berubah                                                                           |
| 🧭 Timeline Status               | ACTIVE → MATCH_FOUND → CLAIMED → VERIFICATION → HANDOVER → RETURNED                                               |
| ⚡ Submit Non-Blocking           | Laporan langsung tersimpan; analisis AI & matching berjalan di background (`after()`)                             |
| 🌱 Graceful Fallback             | Tanpa API key AI, heuristik lokal (termasuk kamus ID→EN) tetap bekerja                                            |

## 🏗️ Teknologi

| Lapisan                   | Teknologi                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Frontend + Backend        | Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS v4                       |
| Database + Auth + Storage | Supabase (PostgreSQL, RLS deny-all, bucket privat)                                         |
| AI                        | Gemini API (`GEMINI_MODEL`, default flash + `gemini-embedding-001`) — **server-side only** |
| Matching                  | Temuin Matching Engine — skor deterministik & explainable di backend                       |

### Arsitektur AI (prinsip)

- **Gemini hanya menyuplai sinyal**: ekstraksi atribut terstruktur, embedding semantik, dan penilaian jawaban verifikasi.
- **Skor akhir dihitung deterministik** oleh Temuin Matching Engine dengan bobot: deskripsi 30 · atribut 20 · lokasi 20 · waktu 15 · ciri khusus 10 · kategori 5. Bobot dinormalisasi ulang bila komponen tidak tersedia, sehingga **pengguna tanpa foto tidak dirugikan**.
- AI tidak pernah "memastikan kepemilikan" — hanya _Potential Match_ dan _saran verifikasi_; keputusan akhir di tangan **operator**.

> 📐 Diagram arsitektur lengkap, skema database, dan flow sistem: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🚀 Setup (± 10 menit)

### 1. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → **New Project**.
2. Buka **SQL Editor** → paste seluruh isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Ini membuat 12 tabel, trigger, RLS, dan bucket storage `report-images`.
3. Jalankan [`supabase/migrations/0002_check_constraints.sql`](supabase/migrations/0002_check_constraints.sql) — CHECK constraint integritas data (koordinat & rentang skor).
4. Jalankan [`supabase/migrations/0003_custody_operator.sql`](supabase/migrations/0003_custody_operator.sql) — tabel `pos`, kolom custody di `found_reports`, dan field keputusan operator di `claims`.

### 2. Konfigurasi environment

```bash
cp .env.example .env.local
```

Isi `.env.local`:

| Variabel                        | Sumber                                                           | Catatan                          |
| ------------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project Settings → API                                           |                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API                                           |                                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Project Settings → API                                           | 🔒 **rahasia, jangan di-commit** |
| `GEMINI_API_KEY`                | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | 🔒 rahasia, hanya dibaca server  |
| `GEMINI_MODEL`                  | opsional                                                         | default `gemini-flash-latest`    |
| `SEED_SECRET`                   | string bebas                                                     | mengunci endpoint seed           |

> 💡 Tanpa `GEMINI_API_KEY` aplikasi tetap berjalan memakai fallback heuristik, tetapi akurasi matching terbaik didapat dengan Gemini.

### 3. Jalankan

```bash
npm install
npm run dev        # development
# atau produksi:
npm run build && npm run start
```

Buka http://localhost:3000 🎉

### 4. (Opsional) Seed data demo

```
http://localhost:3000/api/dev/seed?secret=<SEED_SECRET>
```

Seed membuat akun demo + laporan yang diproses lewat **pipeline AI & matching engine asli** (bukan skor hard-code), lalu membawa skenario utama langsung ke antrean verifikasi operator:

| Akun                       | Password     | Peran                                                          |
| -------------------------- | ------------ | -------------------------------------------------------------- |
| `budi.demo@temuin.app`     | `Temuin!234` | Pemilik dompet Eiger — sudah mengajukan klaim                  |
| `sari.demo@temuin.app`     | `Temuin!234` | Penemu dompet tersebut                                         |
| `andi.demo@temuin.app`     | `Temuin!234` | Laporan negatif (pembanding)                                   |
| `operator.demo@temuin.app` | `Temuin!234` | **Operator pos** — buka `/pos` untuk meninjau klaim (co-pilot) |

Skenario utama ditargetkan menghasilkan **HIGH MATCH (±90%)**, barang sudah `IN_CUSTODY` di pos, dan satu klaim menunggu keputusan operator — langsung mendarat di momen co-pilot AI.

## 🎬 Alur Demo Kompetisi

```
Publik lihat feed /cari  ──►  Budi lapor hilang  ──►  AI match  ──►  Budi klaim + verifikasi
                                                                         │
Operator /pos  ◄── antrean Verifikasi (co-pilot AI: skor + analisis) ────┘
      │
      ├──► Setujui ──► Budi ambil di pos
      └──► Konfirmasi serah terima ──► ✅ RETURNED
```

1. Buka `/cari` (tanpa login) — feed publik barang hilang & temuan.
2. Login `operator.demo@temuin.app` → **`/pos`** → tab **Verifikasi** → lihat **panel co-pilot**: skor + analisis AI per jawaban vs info rahasia penemu.
3. Klik **Setujui klaim** (atau Tolak) — kamu yang memutuskan, AI membantu.
4. Tab **Serah terima** → **Sudah diambil pemilik** → status **RETURNED**.

## 📂 Struktur Project

```
src/
├── app/
│   ├── page.tsx         # Landing + feed publik
│   ├── cari/            # Browse + filter (publik)
│   ├── barang/[id]/     # Detail barang publik (tanpa field sensitif)
│   ├── lapor/           # Form lapor hilang/temuan (publik, login saat submit)
│   ├── (app)/           # Terautentikasi: saya, klaim, pos, notifications, profile
│   └── api/             # Route handlers (images, public-images, seed)
├── components/          # UI: app-shell, report-form, public-*, operator-panels, …
└── lib/
    ├── ai/              # Integrasi Gemini + fallback heuristik
    ├── matching/        # Temuin Matching Engine (deterministik, explainable)
    ├── actions/         # Server Actions (auth, reports, claims, profile, operator)
    ├── custody.ts pos.ts public-reports.ts operator-queues.ts
    └── supabase/        # Client server-side & admin (service role)
supabase/
├── schema.sql           # 12 tabel, trigger, RLS deny-all, storage bucket
└── migrations/          # 0002 CHECK constraints · 0003 custody + operator
docs/
├── ARCHITECTURE.md      # Arsitektur & flow sistem
└── ADMIN_SETUP.md       # Cara mengelola role admin/operator
```

## 🔒 Keamanan & Privasi

- ✅ Semua tabel RLS **deny-all** — data hanya lewat backend (service role) dengan ownership check per-request.
- ✅ `private_verification_info` tidak pernah dikirim ke pengklaim; foto disajikan lewat signed URL berautentikasi.
- ✅ `GEMINI_API_KEY` & `SUPABASE_SERVICE_ROLE_KEY` hanya hidup di environment server — tidak pernah menyentuh browser.
- ✅ Rate limiting pada login/register, pembuatan laporan, klaim, verifikasi, dan ganti password.
- ✅ Validasi input server-side pada semua Server Action (termasuk rentang latitude/longitude) + CHECK constraint di database.
- ✅ Transisi status klaim memakai conditional guard di database — aman dari race condition / double-submit.

---

<div align="center">

**Temuin** — dibuat dengan ❤️ untuk CREATHON 2026

_Karena setiap barang hilang punya cerita, dan setiap cerita layak berakhir dengan "ketemu"._

</div>
