'use client';

import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

const EXTENSION_SESSION_MESSAGE = 'SEPETIQ_SUPABASE_SESSION';
const EXTENSION_BRIDGE_ORIGINS = new Set([
  'http://localhost:3000',
  'https://sepetiq.vercel.app',
]);

function postSessionToExtension(
  userId: string | null | undefined,
  accessToken: string | null | undefined,
) {
  window.postMessage(
    {
      type: EXTENSION_SESSION_MESSAGE,
      userId: userId ?? null,
      accessToken: accessToken ?? null,
    },
    window.location.origin,
  );
}

function postSupabaseSession(session: Session | null) {
  postSessionToExtension(session?.user.id, session?.access_token);
}

export function ExtensionSessionBridge() {
  useEffect(() => {
    if (!EXTENSION_BRIDGE_ORIGINS.has(window.location.origin)) return;

    const supabase = createClient();

    const publishCurrentSession = () => {
      supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
        postSupabaseSession(result.data.session);
      });
    };

    publishCurrentSession();
    const retryTimers = [
      window.setTimeout(publishCurrentSession, 500),
      window.setTimeout(publishCurrentSession, 1500),
    ];

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      postSupabaseSession(session);
    });

    return () => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
