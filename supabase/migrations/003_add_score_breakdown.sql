-- Store verdict score breakdown directly on decisions.
-- Safe to run repeatedly on an existing Supabase project.

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.decisions.score_breakdown IS
  'Verdict score breakdown: {product_score, need_score, budget_score, behavior_score} (0-100)';
