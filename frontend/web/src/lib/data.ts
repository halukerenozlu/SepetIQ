import { createClient } from '@/lib/supabase/server';
import { DashboardDecision, Verdict } from '@/types';

const SAVINGS_VERDICTS = ['wait', 'dont_buy', 'consider_alternative', 'reject'];

export type DashboardStats = {
  totalDecisions: number;
  totalSavings: number;
  avgScore: number;
  thisMonthDecisions: number;
};

const emptyStats: DashboardStats = {
  totalDecisions: 0,
  totalSavings: 0,
  avgScore: 0,
  thisMonthDecisions: 0,
};

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function normalizeVerdict(verdict: string): Verdict {
  return verdict === 'reject' ? 'dont_buy' : (verdict as Verdict);
}

function getConfidenceScore(decision: Record<string, unknown>): number {
  return toNumber(decision.confidence_score ?? decision.confidence);
}

function mapDecision(decision: Record<string, unknown>): DashboardDecision {
  return {
    id: String(decision.id ?? ''),
    user_id: String(decision.user_id ?? ''),
    product_name: String(decision.product_name ?? 'Ürün'),
    product_url: String(decision.product_url ?? ''),
    product_price: toNumber(decision.product_price),
    product_category: String(decision.product_category ?? 'Diğer'),
    verdict: normalizeVerdict(String(decision.verdict ?? 'wait')),
    verdict_message: String(decision.body ?? decision.headline ?? ''),
    shopping_mode: String(decision.mode_used ?? 'balanced'),
    need_score: 0,
    budget_score: 0,
    product_score: 0,
    total_score: getConfidenceScore(decision),
    is_cyclic_recheck: toNumber(decision.total_cycles) > 1,
    total_duration_ms: toNumber(decision.total_duration_ms),
    created_at: String(decision.created_at ?? new Date().toISOString()),
  };
}

export async function getDecisions(
  userId: string,
  limit?: number,
  verdictFilter?: string,
  categoryFilter?: string
): Promise<DashboardDecision[]> {
  if (!userId) {
    return [];
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from('decisions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (verdictFilter && verdictFilter !== 'all') {
      const normalizedFilter = verdictFilter === 'reject' ? 'dont_buy' : verdictFilter;
      query = query.eq('verdict', normalizedFilter);
    }

    if (categoryFilter) {
      query = query.eq('product_category', categoryFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching decisions:', error);
      return [];
    }

    return ((data || []) as Record<string, unknown>[]).map(mapDecision);
  } catch (error) {
    console.error('Error fetching decisions:', error);
    return [];
  }
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  if (!userId) {
    return emptyStats;
  }

  try {
    const supabase = await createClient();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const [
      totalResult,
      savingsResult,
      scoresResult,
      thisMonthResult,
    ] = await Promise.all([
      supabase
        .from('decisions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('decisions')
        .select('product_price')
        .eq('user_id', userId)
        .in('verdict', SAVINGS_VERDICTS),
      supabase
        .from('decisions')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('decisions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth)
        .lt('created_at', startOfNextMonth),
    ]);

    if (totalResult.error) console.error('Error fetching total decisions:', totalResult.error);
    if (savingsResult.error) console.error('Error fetching savings:', savingsResult.error);
    if (scoresResult.error) console.error('Error fetching scores:', scoresResult.error);
    if (thisMonthResult.error) console.error('Error fetching this month decisions:', thisMonthResult.error);

    const savingsData = (savingsResult.data || []) as Record<string, unknown>[];
    const scoresData = (scoresResult.data || []) as Record<string, unknown>[];
    const scoreValues = scoresData
      .map(getConfidenceScore)
      .filter((score) => score > 0);

    return {
      totalDecisions: totalResult.count || 0,
      totalSavings: savingsData.reduce((acc, curr) => acc + toNumber(curr.product_price), 0),
      avgScore: scoreValues.length > 0
        ? Math.round(scoreValues.reduce((acc, score) => acc + score, 0) / scoreValues.length)
        : 0,
      thisMonthDecisions: thisMonthResult.count || 0,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return emptyStats;
  }
}

export function isSavingsVerdict(verdict: string): boolean {
  return SAVINGS_VERDICTS.includes(verdict);
}

export async function getDistinctCategories(userId: string): Promise<string[]> {
  if (!userId) {
    return [];
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('decisions')
      .select('product_category')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching distinct categories:', error);
      return [];
    }

    return Array.from(
      new Set(
        (data || [])
          .map((decision) => decision.product_category)
          .filter((category): category is string => Boolean(category))
      )
    ).sort((a, b) => a.localeCompare(b, 'tr'));
  } catch (error) {
    console.error('Error fetching distinct categories:', error);
    return [];
  }
}
