'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

export function HistoryFilters({
  categories,
  currentVerdict,
  currentCategory,
  hasFilters,
}: {
  categories: string[];
  currentVerdict: string;
  currentCategory?: string;
  hasFilters: boolean;
}) {
  const router = useRouter();

  const handleCategoryChange = (val: string) => {
    const params = new URLSearchParams();
    params.set('verdict', currentVerdict);
    if (val) params.set('category', val);
    router.push(`/dashboard/history?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push('/dashboard/history');
  };

  return (
    <div className="flex items-center gap-2">
      {hasFilters && (
        <button
          onClick={handleClearFilters}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
        >
          <X className="h-3.5 w-3.5" />
          Filtreleri Temizle
        </button>
      )}
      <select
        className="bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        value={currentCategory || ''}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="">Tüm Kategoriler</option>
        {categories.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
