import { createClient } from '@/lib/supabase/server';
import PurchasesClientPage from './PurchasesClientPage';
import { PastPurchase } from '@/types';

export default async function PurchasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PurchasesClientPage initialPurchases={[]} />;
  }

  const { data, error } = await supabase
    .from('past_purchases')
    .select('*')
    .eq('user_id', user.id)
    .order('purchase_date', { ascending: false });

  if (error) {
    console.error('Error fetching past purchases:', error);
  }

  return <PurchasesClientPage initialPurchases={(data || []) as PastPurchase[]} />;
}
