import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { MOCK_DECISIONS } from '@/app/data/dashboardMock';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Filter, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardMockDecision, Verdict } from '@/types';
import { HistoryFilters } from '@/components/dashboard/HistoryFilters';

const verdictConfig: Record<Verdict | 'all', { label: string; color: string; bgColor: string; activeColor: string }> = {
  all: { label: 'Tümü', color: 'text-zinc-600', bgColor: 'bg-zinc-100', activeColor: 'bg-zinc-900 text-white' },
  buy: { label: 'Al', color: 'text-emerald-700', bgColor: 'bg-emerald-100', activeColor: 'bg-emerald-600 text-white' },
  conditional_buy: { label: 'Koşullu', color: 'text-lime-700', bgColor: 'bg-lime-100', activeColor: 'bg-lime-600 text-white' },
  wait: { label: 'Bekle', color: 'text-amber-700', bgColor: 'bg-amber-100', activeColor: 'bg-amber-500 text-white' },
  dont_buy: { label: 'Vazgeç', color: 'text-red-700', bgColor: 'bg-red-100', activeColor: 'bg-red-600 text-white' },
  consider_alternative: { label: 'Alternatif', color: 'text-sky-700', bgColor: 'bg-sky-100', activeColor: 'bg-sky-600 text-white' },
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string; category?: string }>;
}) {
  const { verdict = 'all', category } = await searchParams;
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;

  let decisions: DashboardMockDecision[] = [];

  if (demoUser) {
    decisions = MOCK_DECISIONS;
  } else {
    const supabase = await createClient();
    let query = supabase
      .from('decisions')
      .select('*')
      .order('created_at', { ascending: false });

    if (verdict !== 'all') {
      query = query.eq('verdict', verdict);
    }

    if (category) {
      query = query.eq('product_category', category);
    }

    const { data } = await query;
    // Map DB decisions to display format
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

  // Frontend filtering for demo mode
  if (demoUser) {
    if (verdict !== 'all') {
      decisions = decisions.filter(d => d.verdict === verdict);
    }
    if (category) {
      decisions = decisions.filter(d => d.product_category === category);
    }
  }

  const categories = Array.from(new Set(MOCK_DECISIONS.map(d => d.product_category)));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Karar Geçmişi</h1>
          <p className="text-muted-foreground">Tüm alışveriş analizleriniz bir arada.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl border bg-zinc-50/50 p-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'buy', 'wait', 'dont_buy', 'consider_alternative'] as const).map((v) => (
            <Link
              key={v}
              href={`?verdict=${v}${category ? `&category=${category}` : ''}`}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                verdict === v
                  ? verdictConfig[v].activeColor
                  : "bg-white border text-zinc-600 hover:border-zinc-300"
              )}
            >
              {verdictConfig[v].label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <HistoryFilters
            categories={categories}
            currentVerdict={verdict}
            currentCategory={category}
          />
        </div>
      </div>

      {/* Decision List */}
      <div className="grid gap-4">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-xl">
            <Filter className="h-12 w-12 text-zinc-200 mb-4" />
            <p className="text-zinc-500 font-medium">Aradığınız kriterlere uygun karar bulunamadı.</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/dashboard/history">Filtreleri Temizle</Link>
            </Button>
          </div>
        ) : (
          decisions.map((decision) => (
            <Link key={decision.id} href={`/decisions/${decision.id}`}>
              <Card className="group hover:border-emerald-200 transition-colors overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row md:items-center p-6 gap-6">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "font-semibold uppercase tracking-wider text-[10px]",
                            verdictConfig[decision.verdict].bgColor,
                            verdictConfig[decision.verdict].color
                          )}
                        >
                          {verdictConfig[decision.verdict].label}
                        </Badge>
                        <span className="text-xs text-zinc-400">
                          {new Date(decision.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                        {decision.product_name}
                      </h3>
                      <p className="text-sm text-zinc-500 line-clamp-1">
                        {decision.verdict_message}
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-1">
                      <div className="text-xl font-bold text-zinc-900">
                        {decision.product_price.toLocaleString('tr-TR')} ₺
                      </div>
                      {decision.total_score > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium text-zinc-500 uppercase">Skor:</div>
                          <div className={cn(
                            "text-sm font-bold",
                            decision.total_score >= 80 ? "text-emerald-500" :
                            decision.total_score >= 60 ? "text-lime-500" :
                            decision.total_score >= 40 ? "text-amber-500" :
                            "text-red-500"
                          )}>
                            {decision.total_score}/100
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-zinc-50 group-hover:bg-emerald-50 transition-colors">
                      <ChevronRight className="h-5 w-5 text-zinc-400 group-hover:text-emerald-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
