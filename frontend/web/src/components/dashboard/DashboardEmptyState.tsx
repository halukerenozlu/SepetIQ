import { ShoppingBag } from 'lucide-react';

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
        <ShoppingBag className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-900">Henüz analiz yapmadınız</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        SepetIQ eklentisini yükleyerek bir e-ticaret sayfasında ilk ürün analizinizi yapın.
      </p>
    </div>
  );
}
