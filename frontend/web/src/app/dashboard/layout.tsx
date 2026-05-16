import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient';

const DEMO_PROFILES: Record<string, { name: string; email: string }> = {
  ayse: { name: 'Ayşe Yılmaz', email: 'ayse@demo.sepetiq.com' },
  demo: { name: 'Demo Kullanıcı', email: 'demo@sepetiq.com' },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;

  let displayName: string;

  if (demoUser) {
    const profile = DEMO_PROFILES[demoUser] ?? DEMO_PROFILES['demo'];
    displayName = profile.name;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    displayName = user?.user_metadata?.full_name ?? 'Kullanıcı';
  }

  return (
    <DashboardLayoutClient 
      demoUser={demoUser} 
      displayName={displayName}
    >
      {children}
    </DashboardLayoutClient>
  );
}
