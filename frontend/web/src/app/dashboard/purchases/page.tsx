import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { MOCK_PURCHASES } from '@/app/data/dashboardMock';
import PurchasesClientPage from './PurchasesClientPage';
import { PastPurchase } from '@/types';

export default async function PurchasesPage() {
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;

  let purchases: PastPurchase[] = [];
  
  if (demoUser) {
    purchases = MOCK_PURCHASES;
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from('past_purchases')
      .select('*')
      .order('purchase_date', { ascending: false });
    purchases = data || [];
  }

  return <PurchasesClientPage initialPurchases={purchases} />;
}
