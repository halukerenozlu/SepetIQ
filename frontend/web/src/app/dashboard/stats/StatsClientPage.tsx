'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Zap,
  Target,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { DashboardDecision, Verdict } from '@/types';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';

const COLORS: Record<Verdict, string> = {
  buy: '#10b981',
  conditional_buy: '#84cc16',
  wait: '#f59e0b',
  dont_buy: '#ef4444',
  consider_alternative: '#0ea5e9',
};

const VERDICT_LABELS: Record<Verdict, string> = {
  buy: 'Al',
  conditional_buy: 'Koşullu',
  wait: 'Bekle',
  dont_buy: 'Vazgeç',
  consider_alternative: 'Alternatif',
};

const SAVINGS_VERDICTS = new Set<Verdict>(['wait', 'dont_buy', 'consider_alternative']);

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthlySavings(decisions: DashboardDecision[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: monthKey(date),
      name: date.toLocaleDateString('tr-TR', { month: 'short' }),
      savings: 0,
    };
  });

  const monthMap = new Map(months.map((month) => [month.key, month]));

  decisions.forEach((decision) => {
    if (!SAVINGS_VERDICTS.has(decision.verdict)) return;
    const key = monthKey(new Date(decision.created_at));
    const month = monthMap.get(key);
    if (month) month.savings += decision.product_price;
  });

  return months;
}

function getMostQuestionedCategory(decisions: DashboardDecision[]) {
  const counts = decisions.reduce<Record<string, number>>((acc, decision) => {
    acc[decision.product_category] = (acc[decision.product_category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
}

function formatDuration(decisions: DashboardDecision[]) {
  const durations = decisions
    .map((decision) => decision.total_duration_ms || 0)
    .filter((duration) => duration > 0);

  if (durations.length === 0) return '-';

  const averageMs = durations.reduce((acc, duration) => acc + duration, 0) / durations.length;
  const minutes = averageMs / 60000;

  return minutes >= 1 ? `${minutes.toFixed(1)} dakika` : `${Math.round(averageMs / 1000)} saniye`;
}

export default function StatsClientPage({ decisions }: { decisions: DashboardDecision[] }) {
  if (decisions.length === 0) {
    return (
      <div className="space-y-8 pb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">İstatistikler</h1>
          <p className="text-muted-foreground">Alışveriş alışkanlıklarınızın veri odaklı analizi.</p>
        </div>
        <DashboardEmptyState />
      </div>
    );
  }

  const monthlySavings = buildMonthlySavings(decisions);
  const verdictCounts = decisions.reduce<Record<Verdict, number>>((acc, curr) => {
    acc[curr.verdict] = (acc[curr.verdict] || 0) + 1;
    return acc;
  }, {} as Record<Verdict, number>);

  const pieData = Object.entries(verdictCounts).map(([key, value]) => ({
    name: VERDICT_LABELS[key as Verdict],
    value,
    key: key as Verdict,
  }));

  const scoreTrend = decisions
    .slice()
    .reverse()
    .map((decision, index) => ({
      name: `K${index + 1}`,
      score: decision.total_score,
      date: new Date(decision.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    }));

  const savingsDecisionCount = decisions.filter((decision) => SAVINGS_VERDICTS.has(decision.verdict)).length;
  const savingsRate = Math.round((savingsDecisionCount / decisions.length) * 100);
  const mostQuestionedCategory = getMostQuestionedCategory(decisions);
  const averageDuration = formatDuration(decisions);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">İstatistikler</h1>
        <p className="text-muted-foreground">Alışveriş alışkanlıklarınızın veri odaklı analizi.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <Zap className="h-6 w-6 opacity-80" />
              <ArrowUpRight className="h-5 w-5 opacity-80" />
            </div>
            <div className="text-3xl font-bold">%{savingsRate}</div>
            <p className="mt-1 text-sm opacity-90">Tasarrufa Yönelen Karar Oranı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <Target className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{mostQuestionedCategory}</div>
            <p className="mt-1 text-sm text-zinc-500">En Çok Sorgulanan Kategori</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <Clock className="h-6 w-6 text-sky-500" />
            </div>
            <div className="text-2xl font-bold">{averageDuration}</div>
            <p className="mt-1 text-sm text-zinc-500">Ortalama Karar Süresi</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Aylık Tasarruf (₺)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-70 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySavings}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: '#f4f4f5' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${Number(value).toLocaleString('tr-TR')} ₺`, 'Tasarruf']}
                  />
                  <Bar dataKey="savings" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PieChartIcon className="h-5 w-5 text-sky-500" />
              Karar Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.key} fill={COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LineChartIcon className="h-5 w-5 text-zinc-400" />
              Skor Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${value}/100`, 'Skor']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
