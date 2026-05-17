import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  PiggyBank,
  Zap,
  Calendar,
  ChevronRight,
  BarChart3,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Verdict } from '@/types';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { getDashboardStats, getDecisions } from '@/lib/data';

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
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [decisions, stats] = user
    ? await Promise.all([
        getDecisions(user.id, 5),
        getDashboardStats(user.id),
      ])
    : [[], await getDashboardStats('')];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Kişisel harcama asistanınızın özeti.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Toplam Karar"
          value={stats.totalDecisions.toString()}
          icon={Zap}
          description="Şu ana kadar analiz edilen ürünler"
        />
        <StatCard
          title="Toplam Tasarruf"
          value={`${stats.totalSavings.toLocaleString('tr-TR')} ₺`}
          icon={PiggyBank}
          description="Vazgeçilen veya bekletilen harcamalar"
        />
        <StatCard
          title="Ortalama Skor"
          value={stats.avgScore.toString()}
          icon={BarChart3}
          description="Alışverişlerinizin genel puanı"
        />
        <StatCard
          title="Bu Ay"
          value={stats.thisMonthDecisions.toString()}
          icon={Calendar}
          description={`${new Date().toLocaleDateString('tr-TR', { month: 'long' })} ayındaki toplam aktiviteler`}
        />
      </div>

      {stats.totalDecisions === 0 ? (
        <DashboardEmptyState />
      ) : (
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
                <thead className="border-b bg-zinc-50/50 font-medium text-zinc-500">
                  <tr>
                    <th className="px-6 py-3">Ürün Adı</th>
                    <th className="px-6 py-3">Fiyat</th>
                    <th className="px-6 py-3">Karar</th>
                    <th className="px-6 py-3 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {decisions.map((decision) => (
                    <tr
                      key={decision.id}
                      className="group cursor-pointer transition-colors hover:bg-zinc-50"
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
                            'font-medium',
                            verdictConfig[decision.verdict].bgColor,
                            verdictConfig[decision.verdict].color,
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
