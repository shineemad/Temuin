-- ============================================================
-- TEMUIN — Migration 0003: Custody + Operator (pos serah terima)
--
-- Dijalankan SETELAH schema.sql dan 0002.
-- Non-destruktif: hanya menambah tabel & kolom.
--
-- CARA PAKAI:
-- Supabase Dashboard → SQL Editor → paste isi file ini → Run.
-- ============================================================

-- ---------- pos (titik serah terima) ----------
create table if not exists public.pos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Deny-all: akses hanya lewat backend (service role), konsisten dengan tabel lain.
alter table public.pos enable row level security;

-- ---------- found_reports: kolom custody ----------
alter table public.found_reports
  add column if not exists holding text not null default 'POS'
    check (holding in ('POS','FINDER')),
  add column if not exists pos_id uuid references public.pos(id) on delete set null,
  add column if not exists custody_status text not null default 'AWAITING'
    check (custody_status in ('AWAITING','IN_CUSTODY','RELEASED')),
  add column if not exists received_by uuid references public.profiles(id) on delete set null,
  add column if not exists received_at timestamptz,
  add column if not exists released_at timestamptz;

create index if not exists idx_found_reports_custody
  on public.found_reports(custody_status);
create index if not exists idx_found_reports_pos on public.found_reports(pos_id);

-- ---------- claims: keputusan operator ----------
alter table public.claims
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists operator_note text;

-- ---------- pos demo (hanya jika tabel masih kosong) ----------
insert into public.pos (name, area, description)
select * from (values
  ('Pos Keamanan Gerbang Utama', 'Gerbang Utama', 'Pos satpam di gerbang masuk utama'),
  ('Customer Service Balai Kota', 'Balai Kota', 'Meja layanan warga lantai dasar')
) as seed(name, area, description)
where not exists (select 1 from public.pos);
