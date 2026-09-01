-- ============================================================
-- TEMUIN — Migration 0002: CHECK constraints untuk integritas data
--
-- Dijalankan SETELAH supabase/schema.sql.
-- Non-destruktif: hanya menambah constraint. Data existing sudah
-- diverifikasi valid sebelum migration ini dibuat (2026-08-10).
--
-- CARA PAKAI:
-- Supabase Dashboard → SQL Editor → paste isi file ini → Run.
-- ============================================================

-- Koordinat valid: latitude -90..90, longitude -180..180 (nullable).
do $$ begin
  alter table public.lost_reports
    add constraint chk_lost_latitude check (latitude is null or (latitude between -90 and 90)),
    add constraint chk_lost_longitude check (longitude is null or (longitude between -180 and 180));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.found_reports
    add constraint chk_found_latitude check (latitude is null or (latitude between -90 and 90)),
    add constraint chk_found_longitude check (longitude is null or (longitude between -180 and 180));
exception when duplicate_object then null; end $$;

-- Skor match selalu 0..100.
do $$ begin
  alter table public.matches
    add constraint chk_matches_final_score check (final_score between 0 and 100);
exception when duplicate_object then null; end $$;

-- Skor verifikasi klaim 0..100 (nullable sebelum verifikasi dikirim).
do $$ begin
  alter table public.claims
    add constraint chk_claims_verification_score
      check (verification_score is null or (verification_score between 0 and 100));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.claim_verifications
    add constraint chk_claim_verifications_score
      check (score is null or (score between 0 and 100));
exception when duplicate_object then null; end $$;
