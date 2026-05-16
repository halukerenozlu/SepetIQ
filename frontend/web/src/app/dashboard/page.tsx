import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { MOCK_DECISIONS } from '@/app/data/dashboardMock';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ShoppingBag,
  PiggyBank,
  Zap,
  Calendar,
  ChevronRight,
  BarChart3,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardMockDecision, Verdict } from '@/types';

const verdictConfig: Record<Verdict, { label: string; color: string; bgColor: string }> = {
  buy: { label: 'Al', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  conditional_buy: { label: 'Koşullu', color: 'text-lime-700', bgColor: 'bg-lime-100' },
  wait: { label: 'Bekle', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  dont_buy: { label: 'Vazgeç', color: 'text-red-700', bgColor: 'bg-red-100' },
  consider_alternative: { label: 'Alternatif', color: 'text-sky-700', bgColor: 'bg-sky-100' },
};

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend 
}: { 
  title: string; 
  value: string; 
  icon: LucideIcon;
  description?: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <span className={cn(
              "text-xs font-medium",
              trend.positive ? "text-emerald-600" : "text-red-600"
            )}>
              {trend.value}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;

  let decisions: DashboardMockDecision[] = [];

  if (demoUser) {
    decisions = MOCK_DECISIONS;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from('decisions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
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

  // Calculate stats
  const totalDecisions = decisions.length;
  const totalSavings = decisions
    .filter(d => d.verdict === 'dont_buy' || d.verdict === 'wait')
    .reduce((acc, curr) => acc + curr.product_price, 0);
  
  const avgScore = totalDecisions > 0 
    ? Math.round(decisions.reduce((acc, curr) => acc + curr.total_score, 0) / totalDecisions)
    : 0;
  
  const thisMonthDecisions = decisions.filter(d => {
    const date = new Date(d.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const recentDecisions = decisions.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Kişisel harcama asistanınızın özeti.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Toplam Karar" 
          value={totalDecisions.toString()} 
          icon={Zap} 
          description="Şu ana kadar analiz edilen ürünler"
        />
        <StatCard 
          title="Toplam Tasarruf" 
          value={`${totalSavings.toLocaleString('tr-TR')} ₺`} 
          icon={PiggyBank} 
          description="Vazgeçilen veya bekletilen harcamalar"
          trend={{ value: "+12%", positive: true }}
        />
        <StatCard 
          title="Ortalama Skor" 
          value={avgScore.toString()} 
          icon={BarChart3} 
          description="Alışverişlerinizin genel puanı"
        />
        <StatCard 
          title="Bu Ay" 
          value={thisMonthDecisions.toString()} 
          icon={Calendar} 
          description="Mayıs ayındaki toplam aktiviteler"
        />
      </div>

      {/* Onboarding Banner */}
      {totalDecisions === 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-emerald-900">Henüz karar yok!</h3>
          <p className="mt-2 text-emerald-700">
            SepetIQ henüz hiçbir ürün sayfasında çalışmadı. Chrome eklentisini kurup bir ürün sayfasına giderek ilk analizinizi başlatabilirsiniz.
          </p>
          <Button className="mt-6 bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href="/extension-setup">Eklentiyi Kur</Link>
          </Button>
        </div>
      )}

      {/* Recent Decisions Table */}
      {totalDecisions > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Son Kararlar</CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:text-emerald-700">
              <Link href="/dashboard/history" className="flex items-center gap-1">
                Tümünü Gör <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-zinc-50/50 text-zinc-500 font-medium">
                  <tr>
                    <th className="px-6 py-3">Ürün Adı</th>
                    <th className="px-6 py-3">Fiyat</th>
                    <th className="px-6 py-3">Karar</th>
                    <th className="px-6 py-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentDecisions.map((decision) => (
                    <tr 
                      key={decision.id} 
                      className="group cursor-pointer hover:bg-zinc-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link href={`/decisions/${decision.id}`} className="font-medium text-zinc-900 group-hover:text-emerald-600">
                          {decision.product_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-zinc-600">
                        {decision.product_price.toLocaleString('tr-TR')} ₺
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "font-medium",
                            verdictConfig[decision.verdict].bgColor,
                            verdictConfig[decision.verdict].color
                          )}
                        >
                          {verdictConfig[decision.verdict].label}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-zinc-400">
                        {new Date(decision.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

