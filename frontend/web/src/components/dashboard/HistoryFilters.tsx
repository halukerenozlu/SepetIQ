'use client';

import { useRouter } from 'next/navigation';

export function HistoryFilters({
  categories,
  currentVerdict,
  currentCategory,
}: {
  categories: string[];
  currentVerdict: string;
  currentCategory?: string;
}) {
  const router = useRouter();

  return (
    <select
      className="bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      defaultValue={currentCategory || ''}
      onChange={(e) => {
        const val = e.target.value;
        const params = new URLSearchParams();
        params.set('verdict', currentVerdict);
        if (val) params.set('category', val);
        router.push(`/dashboard/history?${params.toString()}`);
      }}
    >
      <option value="">Tüm Kategoriler</option>
      {categories.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
