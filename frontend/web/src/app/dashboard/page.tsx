import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

const DEMO_PROFILES: Record<string, { name: string; email: string }> = {
  ayse: { name: 'Ayse Yilmaz', email: 'ayse@demo.sepetiq.com' },
  demo: { name: 'Demo Kullanici', email: 'demo@sepetiq.com' },
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const demoUser = cookieStore.get('sepetiq-demo-user')?.value;

  let displayName: string;
  let displayEmail: string;

  if (demoUser) {
    const profile = DEMO_PROFILES[demoUser] ?? DEMO_PROFILES['demo'];
    displayName = profile.name;
    displayEmail = profile.email;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    displayName = user?.user_metadata?.full_name ?? 'Kullanici';
    displayEmail = user?.email ?? '';
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hos geldin, {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">{displayEmail}</p>
        </div>
        <LogoutButton />
      </div>

      {demoUser && (
        <div className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          Demo modunda goruntuluyorsun ({demoUser})
        </div>
      )}

      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-12 text-muted-foreground">
        Dashboard — Coming Soon
      </div>
    </div>
  );
}
