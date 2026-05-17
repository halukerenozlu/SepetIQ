import { createClient } from '@/lib/supabase/server';
import { getDecisions } from '@/lib/data';
import StatsClientPage from './StatsClientPage';

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const decisions = user ? await getDecisions(user.id) : [];

  return <StatsClientPage decisions={decisions} />;
}
