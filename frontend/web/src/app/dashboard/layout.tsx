import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import DashboardLayoutClient from '@/components/dashboard/DashboardLayoutClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.full_name ?? 'Kullanıcı';

  return (
    <DashboardLayoutClient
      demoUser={demoUser}
      displayName={displayName}
    >
      {children}
    </DashboardLayoutClient>
  );
}
