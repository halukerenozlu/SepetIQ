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
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  PieChart as PieChartIcon, 
  LineChart as LineChartIcon,
  Zap,
  Target,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { DashboardMockDecision, Verdict } from '@/types';

const COLORS: Record<string, string> = {
  buy: '#10b981', // emerald-500
  conditional_buy: '#84cc16', // lime-500
  wait: '#f59e0b', // amber-500
  dont_buy: '#ef4444', // red-500
  consider_alternative: '#0ea5e9', // sky-500
};

export default function StatsClientPage({ decisions, isDemoMode }: { decisions: DashboardMockDecision[]; isDemoMode: boolean }) {
  if (decisions.length === 0 && !isDemoMode) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <PieChartIcon className="h-16 w-16 text-zinc-200 mb-4" />
        <h2 className="text-xl font-bold text-zinc-700">Henüz yeterli veri yok</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-md">
          SepetIQ ile alışveriş kararları verdikçe burada istatistikleriniz görünecek.
        </p>
      </div>
    );
  }
  // 1. Monthly Savings Data
  const monthlySavings = [
    { name: 'Ocak', savings: 4500 },
    { name: 'Şubat', savings: 3200 },
    { name: 'Mart', savings: 5800 },
    { name: 'Nisan', savings: 4100 },
    { name: 'Mayıs', savings: 7500 },
  ];

  // 2. Decision Distribution
  const verdictCounts = decisions.reduce((acc, curr) => {
    acc[curr.verdict] = (acc[curr.verdict] || 0) + 1;
    return acc;
  }, {} as Record<Verdict, number>);

  const pieData = Object.entries(verdictCounts).map(([key, value]) => ({
    name: key === 'buy' ? 'Al' : key === 'wait' ? 'Bekle' : key === 'skip' ? 'Vazgeç' : 'Alternatif',
    value,
    key
  }));

  // 3. Score Trend
  const scoreTrend = decisions.slice().reverse().map((d, i) => ({
    name: `K${i+1}`,
    score: d.total_score,
    date: new Date(d.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  }));

  // 4. Insights
  const mostQuestionedCategory = 'Elektronik'; // In a real app, calculate this
  const savingsRate = "67%";

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">İstatistikler</h1>
        <p className="text-muted-foreground">Alışveriş alışkanlıklarınızın veri odaklı analizi.</p>
      </div>

      {/* Insights Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="h-6 w-6 opacity-80" />
              <ArrowUpRight className="h-5 w-5 opacity-80" />
            </div>
            <div className="text-3xl font-bold">{savingsRate}</div>
            <p className="text-sm opacity-90 mt-1">Harcama Tasarruf Oranı</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Target className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{mostQuestionedCategory}</div>
            <p className="text-sm text-zinc-500 mt-1">En Çok Sorgulanan Kategori</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-6 w-6 text-sky-500" />
            </div>
            <div className="text-2xl font-bold">2.3 Dakika</div>
            <p className="text-sm text-zinc-500 mt-1">Ortalama Karar Süresi</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Bar Chart: Monthly Savings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Aylık Tasarruf (₺)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySavings}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="savings" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart: Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-sky-500" />
              Karar Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.key as Verdict]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart: Score Trend */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-zinc-400" />
              Skor Trendi
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
