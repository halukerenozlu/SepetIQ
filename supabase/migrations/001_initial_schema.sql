-- Initial schema — exported from Supabase Dashboard on 2026-05-18
-- Reflects the current production DB state as ground truth.
-- IF NOT EXISTS: safe to run on existing DB (baseline migration).

CREATE TABLE IF NOT EXISTS public.agent_traces (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL,
  agent_name text NOT NULL,
  cycle_iteration integer NOT NULL DEFAULT 1,
  sequence_order integer NOT NULL,
  started_at timestamp with time zone NOT NULL,
  completed_at timestamp with time zone,
  duration_ms integer,
  status text NOT NULL CHECK (status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text, 'skipped'::text])),
  input_summary text,
  output_summary text,
  key_findings jsonb,
  triggered_actions jsonb,
  error_message text,
  CONSTRAINT agent_traces_pkey PRIMARY KEY (id),
  CONSTRAINT agent_traces_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES public.decisions(id)
);

CREATE TABLE IF NOT EXISTS public.decision_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  decision_id uuid NOT NULL,
  cycle_iteration integer NOT NULL DEFAULT 1,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type = ANY (ARRAY['multiple_choice'::text, 'yes_no'::text, 'scale'::text, 'free_text'::text])),
  options jsonb,
  triggered_by text,
  user_answer jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT decision_questions_pkey PRIMARY KEY (id),
  CONSTRAINT decision_questions_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES public.decisions(id)
);

CREATE TABLE IF NOT EXISTS public.decision_scores (
  decision_id uuid NOT NULL,
  product_fit integer NOT NULL CHECK (product_fit >= 0 AND product_fit <= 100),
  review_risk integer NOT NULL CHECK (review_risk >= 0 AND review_risk <= 100),
  need_score integer NOT NULL CHECK (need_score >= 0 AND need_score <= 100),
  fit_reasoning jsonb,
  risk_factors jsonb,
  need_reasoning jsonb,
  CONSTRAINT decision_scores_pkey PRIMARY KEY (decision_id),
  CONSTRAINT decision_scores_decision_id_fkey FOREIGN KEY (decision_id) REFERENCES public.decisions(id)
);

CREATE TABLE IF NOT EXISTS public.decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  product_category text NOT NULL,
  product_price numeric NOT NULL,
  product_url text,
  product_thumbnail text,
  mode_used text NOT NULL CHECK (mode_used = ANY (ARRAY['soft'::text, 'balanced'::text, 'strict'::text])),
  verdict text NOT NULL CHECK (verdict = ANY (ARRAY['buy'::text, 'conditional_buy'::text, 'wait'::text, 'dont_buy'::text, 'consider_alternative'::text])),
  confidence integer CHECK (confidence >= 0 AND confidence <= 100),
  headline text NOT NULL,
  body text NOT NULL,
  suggested_action text,
  user_action text CHECK (user_action = ANY (ARRAY['followed'::text, 'ignored'::text, 'purchased_anyway'::text])),
  user_action_at timestamp with time zone,
  estimated_savings numeric,
  total_cycles integer DEFAULT 1,
  total_duration_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT decisions_pkey PRIMARY KEY (id),
  CONSTRAINT decisions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.demo_products (
  id text NOT NULL,
  name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['electronics'::text, 'cosmetics'::text])),
  subcategory text,
  price numeric NOT NULL,
  thumbnail_url text,
  image_urls jsonb,
  description text,
  technical_specs jsonb,
  brand text,
  is_active boolean DEFAULT true,
  demo_scenario text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT demo_products_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.demo_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text NOT NULL,
  review_date date NOT NULL,
  reviewer_name text,
  verified_buyer boolean DEFAULT true,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT demo_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT demo_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.demo_products(id)
);

CREATE TABLE IF NOT EXISTS public.demo_user_profiles (
  id text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  age integer,
  occupation text,
  persona_description text,
  default_mode text NOT NULL,
  monthly_budget numeric,
  past_purchases jsonb,
  behavioral_traits jsonb,
  CONSTRAINT demo_user_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.past_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  price numeric NOT NULL,
  purchase_date date NOT NULL,
  usage_frequency text CHECK (usage_frequency = ANY (ARRAY['never'::text, 'rarely'::text, 'sometimes'::text, 'often'::text, 'daily'::text])),
  satisfaction text CHECK (satisfaction = ANY (ARRAY['regretted'::text, 'neutral'::text, 'satisfied'::text])),
  notes text,
  source text DEFAULT 'manual'::text CHECK (source = ANY (ARRAY['manual'::text, 'decision'::text, 'imported'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT past_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT past_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL,
  default_mode text DEFAULT 'balanced'::text CHECK (default_mode = ANY (ARRAY['soft'::text, 'balanced'::text, 'strict'::text])),
  monthly_budget numeric,
  savings_goal numeric,
  notifications_enabled boolean DEFAULT true,
  timezone text DEFAULT 'Europe/Istanbul'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL,
  display_name text,
  avatar_url text,
  onboarded boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
