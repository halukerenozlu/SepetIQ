import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Verdict } from '@/types';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { HistoryFilters } from '@/components/dashboard/HistoryFilters';
import { getDecisions, getDistinctCategories } from '@/lib/data';

const verdictConfig: Record<Verdict | 'all', { label: string; color: string; bgColor: string; activeColor: string }> = {
  all: { label: 'Tümü', color: 'text-zinc-600', bgColor: 'bg-zinc-100', activeColor: 'bg-zinc-900 text-white' },
  buy: { label: 'Al', color: 'text-emerald-700', bgColor: 'bg-emerald-100', activeColor: 'bg-emerald-600 text-white' },
  conditional_buy: { label: 'Şartlı Al', color: 'text-lime-700', bgColor: 'bg-lime-100', activeColor: 'bg-lime-600 text-white' },
  wait: { label: 'Bekle', color: 'text-amber-700', bgColor: 'bg-amber-100', activeColor: 'bg-amber-500 text-white' },
  dont_buy: { label: 'Vazgeç', color: 'text-red-700', bgColor: 'bg-red-100', activeColor: 'bg-red-600 text-white' },
  consider_alternative: { label: 'Uygun Değil', color: 'text-sky-700', bgColor: 'bg-sky-100', activeColor: 'bg-sky-600 text-white' },
};

const verdictFilters = ['all', 'buy', 'conditional_buy', 'wait', 'dont_buy', 'consider_alternative'] as const;

function createHistoryHref(verdict: string, category?: string) {
  const params = new URLSearchParams();
  params.set('verdict', verdict);
  if (category) params.set('category', category);
  return `/dashboard/history?${params.toString()}`;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ verdict?: string; category?: string }>;
}) {
  const { verdict = 'all', category } = await searchParams;
  const activeVerdict = verdict === 'reject' ? 'dont_buy' : verdict;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [decisions, categories] = user
    ? await Promise.all([
        getDecisions(user.id, undefined, activeVerdict, category),
        getDistinctCategories(user.id),
      ])
    : [[], []];

  const hasFilters = Boolean(category || activeVerdict !== 'all');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Karar Geçmişi</h1>
          <p className="text-muted-foreground">SepetIQ’nun sorguladığı ürünler ve sonuçları.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-zinc-50/50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {verdictFilters.map((v) => (
            <Link
              key={v}
              href={createHistoryHref(v, category)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeVerdict === v
                  ? verdictConfig[v].activeColor
                  : 'border bg-white text-zinc-600 hover:border-zinc-300',
              )}
            >
              {verdictConfig[v].label}
            </Link>
          ))}
        </div>

        <HistoryFilters
          categories={categories}
          currentVerdict={activeVerdict}
          currentCategory={category}
          hasFilters={hasFilters}
        />
      </div>

      <div className="grid gap-4">
        {decisions.length === 0 ? (
          <DashboardEmptyState
            tone={hasFilters ? 'filtered' : 'default'}
            title={hasFilters ? 'Bu filtrelerle karar bulunamadı' : 'Henüz karar geçmişiniz yok'}
            description={
              hasFilters
                ? 'Filtreleri temizleyerek tüm karar geçmişinizi yeniden görüntüleyebilirsiniz.'
                : 'Desteklenen bir ürün sayfasında SepetIQ analizini çalıştırdığınızda kararlarınız burada listelenir.'
            }
          />
        ) : (
          decisions.map((decision) => (
            <Link key={decision.id} href={`/decisions/${decision.id}`}>
              <Card className="group overflow-hidden transition-colors hover:border-emerald-200">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider',
                            verdictConfig[decision.verdict].bgColor,
                            verdictConfig[decision.verdict].color,
                          )}
                        >
                          {verdictConfig[decision.verdict].label}
                        </Badge>
                        <span className="text-xs text-zinc-400">
                          {new Date(decision.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <h3 className="line-clamp-2 text-lg font-bold text-zinc-900 transition-colors group-hover:text-emerald-600">
                        {decision.product_name}
                      </h3>
                      <p className="line-clamp-1 text-sm text-zinc-500">
                        {decision.verdict_message}
                      </p>
                    </div>

                    <div className="flex flex-row items-center gap-4 md:flex-col md:items-end md:gap-1">
                      <div className="text-xl font-bold text-zinc-900">
                        {decision.product_price.toLocaleString('tr-TR')} ₺
                      </div>
                      {decision.total_score > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium uppercase text-zinc-500">Skor:</div>
                          <div className={cn(
                            'text-sm font-bold',
                            decision.total_score >= 80 ? 'text-emerald-500'
                              : decision.total_score >= 60 ? 'text-lime-500'
                                : decision.total_score >= 40 ? 'text-amber-500'
                                  : 'text-red-500',
                          )}>
                            {decision.total_score}/100
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-zinc-50 transition-colors group-hover:bg-emerald-50 md:flex">
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
