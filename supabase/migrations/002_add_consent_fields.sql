-- KVKK/GDPR consent alanları — user_profiles tablosuna eklenir
-- Dashboard'dan da uygulanabilir: SQL Editor'a yapıştır ve çalıştır.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS privacy_accepted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_version      TEXT,
  ADD COLUMN IF NOT EXISTS analytics_consent    BOOLEAN NOT NULL DEFAULT false;
