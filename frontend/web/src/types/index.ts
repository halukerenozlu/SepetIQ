/**
 * PRODUCT TYPES
 * Ürün ile ilgili temel tip tanımlamaları
 */

export interface ProductSpec {
  name: string;
  value: string;
}

export interface Review {
  author: string;
  rating: number;
  date: string;
  text: string;
}

export interface Product {
  id: string;
  name: string;
  originalPrice: number;
  discountedPrice: number;
  rating: number;
  reviewCount: number;
  seller: string;
  categories: string[];
  imageUrl: string;
  specs: ProductSpec[];
  reviews: Review[];
}

/**
 * USER & SESSION TYPES
 * Kullanıcı ve oturum yönetimi tipleri
 */

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

/**
 * DASHBOARD TYPES — DB-aligned (docs/DATABASE.md)
 */

// DB: user_preferences.default_mode CHECK ('soft', 'balanced', 'strict')
export type ShoppingMode = 'soft' | 'balanced' | 'strict';

export interface UserPreference {
  user_id: string;
  default_mode: ShoppingMode;
  monthly_budget: number;
  savings_goal?: number;
  notifications_enabled: boolean;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

// DB: decisions.verdict CHECK
export type Verdict = 'buy' | 'conditional_buy' | 'wait' | 'dont_buy' | 'consider_alternative';

// DB: public.decisions table
export interface Decision {
  id: string;
  user_id: string;
  product_name: string;
  product_category: string;
  product_price: number;
  product_url?: string;
  product_thumbnail?: string;
  mode_used: ShoppingMode;
  verdict: Verdict;
  confidence?: number;
  headline: string;
  body: string;
  suggested_action?: string;
  user_action?: 'followed' | 'ignored' | 'purchased_anyway';
  user_action_at?: string;
  estimated_savings?: number;
  total_cycles?: number;
  total_duration_ms?: number;
  score_breakdown?: Record<string, number>;
  created_at: string;
}

// DB: public.decision_scores table
export interface DecisionScore {
  decision_id: string;
  product_fit: number;
  review_risk: number;
  need_score: number;
  fit_reasoning?: string[];
  risk_factors?: { type: string; severity: string; description: string }[];
  need_reasoning?: string[];
}

// DB: past_purchases.usage_frequency CHECK ('never', 'rarely', 'sometimes', 'often', 'daily')
export type UsageFrequency = 'never' | 'rarely' | 'sometimes' | 'often' | 'daily';

// DB: past_purchases.satisfaction CHECK ('regretted', 'neutral', 'satisfied')
export type Satisfaction = 'regretted' | 'neutral' | 'satisfied';

export interface PastPurchase {
  id: string;
  user_id: string;
  product_name: string;
  category: string;
  subcategory?: string;
  price: number;
  purchase_date: string;
  usage_frequency?: UsageFrequency;
  satisfaction?: Satisfaction;
  notes?: string;
  source?: 'manual' | 'decision' | 'imported';
  created_at: string;
}

export interface AgentTrace {
  id: string;
  decision_id: string;
  agent_name: string;
  cycle_iteration: number;
  sequence_order: number;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  input_summary?: string;
  output_summary?: string;
  key_findings?: string[];
  triggered_actions?: string[];
  error_message?: string;
}

/**
 * MOCK TYPES — Demo için (DB'den bağımsız, flatten edilmiş)
 */

export interface DashboardDecision {
  id: string;
  user_id: string;
  product_name: string;
  product_url: string;
  product_price: number;
  product_category: string;
  verdict: Verdict;
  verdict_message: string;
  shopping_mode: string;
  need_score: number;
  budget_score: number;
  product_score: number;
  total_score: number;
  is_cyclic_recheck: boolean;
  total_duration_ms?: number;
  created_at: string;
}

export type DashboardMockDecision = DashboardDecision;

/**
 * API & RESPONSE TYPES
 * Backend servislerinden dönen yanıt tipleri
 */

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}
