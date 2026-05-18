-- Migration: decisions tablosuna score_breakdown JSONB kolonu ekle
-- Verdict agent'in hesapladığı 4 skoru (product_score, need_score, budget_score, behavior_score)
-- decisions tablosunda saklamak için. decision_scores tablosu yerine bu yaklaşım,
-- backend'in mevcut çıktı formatıyla tam uyumludur.

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.decisions.score_breakdown IS
  'Verdict agent score breakdown: {product_score, need_score, budget_score, behavior_score} (0-100)';
