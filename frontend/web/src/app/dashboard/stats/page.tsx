import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { MOCK_DECISIONS } from '@/app/data/dashboardMock';
import StatsClientPage from './StatsClientPage';
import { DashboardMockDecision, Verdict } from '@/types';

export default async function StatsPage() {
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;

  let decisions: DashboardMockDecision[] = [];

  if (demoUser) {
    // Demo mode: mock data göster
    decisions = MOCK_DECISIONS;
  } else {
    // Gerçek kullanıcı: Supabase'den çek
    const supabase = await createClient();
    const { data } = await supabase
      .from('decisions')
      .select('*')
      .order('created_at', { ascending: false });

    decisions = (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      user_id: d.user_id as string,
      product_name: d.product_name as string,
      product_url: (d.product_url as string) || '',
      product_price: d.product_price as number,
      product_category: d.product_category as string,
      verdict: d.verdict as Verdict,
      verdict_message: d.body as string,
      shopping_mode: d.mode_used as string,
      need_score: 0,
      budget_score: 0,
      product_score: 0,
      total_score: 0,
      is_cyclic_recheck: (d.total_cycles as number) > 1,
      created_at: d.created_at as string,
    }));
  }

  return <StatsClientPage decisions={decisions} isDemoMode={!!demoUser} />;
}
