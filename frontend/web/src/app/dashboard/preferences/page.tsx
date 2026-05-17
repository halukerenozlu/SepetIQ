import { createClient } from '@/lib/supabase/server';
import PreferencesClientPage from './PreferencesClientPage';
import { UserPreference } from '@/types';

function createDefaultPreferences(userId = ''): UserPreference {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    default_mode: 'balanced',
    monthly_budget: 0,
    notifications_enabled: true,
    timezone: 'Europe/Istanbul',
    created_at: now,
    updated_at: now,
  };
}

export default async function PreferencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <PreferencesClientPage initialPrefs={createDefaultPreferences()} />;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user preferences:', error);
  }

  return <PreferencesClientPage initialPrefs={data || createDefaultPreferences(user.id)} />;
}
