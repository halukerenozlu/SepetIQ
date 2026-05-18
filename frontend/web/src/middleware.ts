import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/decisions', '/consent'];
const DEMO_USER_WHITELIST = ['ayse', 'mehmet', 'can'];
const DEMO_COOKIE = 'sepetiq-demo-user';
const DEMO_COOKIE_MAX_AGE = 86400; // 24 hours

function isDemoModeEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DEMO_ENABLED === 'true'
  );
}

function expireDemoCookie(response: NextResponse): void {
  response.cookies.set(DEMO_COOKIE, '', { path: '/', maxAge: 0 });
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const demoEnabled = isDemoModeEnabled();

  // Demo mode bypass via query params
  if (demoEnabled && searchParams.get('demo') === 'true') {
    const demoUser = searchParams.get('user') ?? 'demo';

    if (!DEMO_USER_WHITELIST.includes(demoUser)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = '';
      const response = NextResponse.redirect(url);
      expireDemoCookie(response);
      return response;
    }

    request.cookies.set(DEMO_COOKIE, demoUser);
    const response = NextResponse.next({ request });
    response.cookies.set(DEMO_COOKIE, demoUser, {
      path: '/',
      maxAge: DEMO_COOKIE_MAX_AGE,
    });
    return response;
  }

  // Env validation — fail-closed: redirect to login if env is missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      'Missing Supabase env variables — check .env.local. ' +
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.',
    );
    return NextResponse.redirect(new URL('/login?error=auth_config', request.url));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Demo cookie bypass — only when demo mode is enabled
  const demoCookieValue = request.cookies.get(DEMO_COOKIE)?.value;
  const hasDemoCookie = demoCookieValue !== undefined;

  if (hasDemoCookie && !demoEnabled) {
    // Demo mode disabled but cookie lingers — expire it
    expireDemoCookie(supabaseResponse);
  }

  if (hasDemoCookie && demoEnabled && !DEMO_USER_WHITELIST.includes(demoCookieValue)) {
    // Invalid demo user in cookie — expire and redirect
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    expireDemoCookie(response);
    return response;
  }

  const validDemoBypass = hasDemoCookie && demoEnabled && DEMO_USER_WHITELIST.includes(demoCookieValue);

  if (!user && !validDemoBypass && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Giriş yapmış kullanıcı /login'e gelirse yönlendir
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('privacy_accepted_at')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile?.privacy_accepted_at ? '/dashboard' : '/consent';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/decisions/:path*', '/consent', '/login'],
};
