'use client';

import { useRouter } from 'next/navigation';
import { PurchaseForm } from '@/components/dashboard/PurchaseForm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trash2,
  ShoppingBag,
  Smile,
  Clock,
  History
} from 'lucide-react';
import { PastPurchase, UsageFrequency, Satisfaction } from '@/types';
import { createClient } from '@/lib/supabase/client';

const satisfactionIcons: Record<Satisfaction, string> = {
  satisfied: '😊',
  neutral: '😐',
  regretted: '😕'
};

const frequencyLabels: Record<UsageFrequency, string> = {
  daily: 'Her Gün',
  often: 'Sık Sık',
  sometimes: 'Ara Sıra',
  rarely: 'Nadiren',
  never: 'Hiç'
};

export default function PurchasesClientPage({ 
  initialPurchases 
}: { 
  initialPurchases: PastPurchase[] 
}) {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm('Bu alışverişi silmek istediğinizden emin misiniz?')) return;
    
    const supabase = createClient();
    const { error } = await supabase.from('past_purchases').delete().eq('id', id);
    
    if (error) {
      alert('Hata oluştu!');
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alışverişlerim</h1>
        <p className="text-muted-foreground">Geçmiş harcamalarınızı yönetin.</p>
      </div>

      <PurchaseForm onRefresh={() => router.refresh()} />

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-zinc-400" />
          Kayıtlı Alışverişler
        </h2>

        {initialPurchases.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-zinc-200" />
            <h3 className="mt-4 text-lg font-semibold text-zinc-900">Henüz alışveriş yok</h3>
            <p className="mt-2 text-zinc-500 max-w-sm mx-auto">
              Geçmiş alışverişlerinizi ekleyerek SepetIQ&apos;nun sizi daha iyi tanımasını sağlayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {initialPurchases.map((purchase) => (
              <Card key={purchase.id} className="relative group overflow-hidden border-zinc-100 hover:border-emerald-200 transition-colors">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                          {purchase.category}
                        </Badge>
                        <span className="text-xs text-zinc-400">
                          {new Date(purchase.purchase_date).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900">{purchase.product_name}</h3>
                    </div>
                    <div className="text-xl font-bold text-emerald-600">
                      {purchase.price.toLocaleString('tr-TR')} ₺
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4 border-t">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium text-zinc-700">{purchase.usage_frequency ? frequencyLabels[purchase.usage_frequency] : '-'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Smile className="h-3.5 w-3.5" />
                      <span className="font-medium text-zinc-700">
                        {purchase.satisfaction ? `${satisfactionIcons[purchase.satisfaction]} ${purchase.satisfaction === 'satisfied' ? 'Memnun' : purchase.satisfaction === 'neutral' ? 'Nötr' : 'Pişman'}` : '-'}
                      </span>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(purchase.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
