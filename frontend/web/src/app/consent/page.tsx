import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsentForm } from './ConsentForm';

export default async function ConsentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Zaten onaylamışsa dashboard'a gönder
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('privacy_accepted_at')
    .eq('id', user.id)
    .single();

  if (profile?.privacy_accepted_at) redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-2xl font-bold tracking-tight">
            Sepet<span className="text-emerald-500">IQ</span>
          </div>
          <CardTitle>Gizlilik Onayı</CardTitle>
          <CardDescription>
            Devam etmek için kişisel veri işleme politikamızı onaylamanız gerekiyor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConsentForm />
        </CardContent>
      </Card>
    </div>
  );
}
