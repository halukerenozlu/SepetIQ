'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const PRIVACY_VERSION = '2026-01';

export async function acceptConsent(analyticsConsent: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  await supabase
    .from('user_profiles')
    .update({
      privacy_accepted_at: new Date().toISOString(),
      privacy_version: PRIVACY_VERSION,
      analytics_consent: analyticsConsent,
    })
    .eq('id', user.id);

  redirect('/dashboard');
}

export async function declineConsent() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login?consent=declined');
}
