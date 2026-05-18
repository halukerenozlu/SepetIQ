import { BarChart3, LucideIcon, SearchX, ShoppingBag } from 'lucide-react';

const iconMap = {
  default: ShoppingBag,
  filtered: SearchX,
  stats: BarChart3,
} satisfies Record<string, LucideIcon>;

export function DashboardEmptyState({
  title = 'Henüz analiz yapmadınız',
  description = 'SepetIQ eklentisini yükleyerek bir e-ticaret sayfasında ilk ürün analizinizi yapın.',
  tone = 'default',
}: {
  title?: string;
  description?: string;
  tone?: keyof typeof iconMap;
}) {
  const Icon = iconMap[tone];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-600">{description}</p>
    </div>
  );
}
