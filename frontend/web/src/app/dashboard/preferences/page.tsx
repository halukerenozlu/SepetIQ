import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { MOCK_PREFERENCES } from '@/app/data/dashboardMock';
import PreferencesClientPage from './PreferencesClientPage';
import { UserPreference } from '@/types';

export default async function PreferencesPage() {
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;

  let prefs: UserPreference;
  
  if (demoUser) {
    prefs = MOCK_PREFERENCES;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      prefs = data || MOCK_PREFERENCES;
    } else {
      prefs = MOCK_PREFERENCES;
    }
  }

  return <PreferencesClientPage initialPrefs={prefs} />;
}
