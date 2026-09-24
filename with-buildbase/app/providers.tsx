'use client';

import '@buildbase/sdk/css';

import { ApiVersion } from '@buildbase/sdk';
import { SaaSOSProvider } from '@buildbase/sdk/react';

import { isConfigured } from '@/lib/config';

export function Providers({ children }: { children: React.ReactNode }) {
  // Before the env is filled in there is no org to connect to; the page shows
  // the setup steps instead.
  if (!isConfigured) return <>{children}</>;

  return (
    <SaaSOSProvider
      serverUrl={
        process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ||
        'https://api.console.buildbase.app'
      }
      version={ApiVersion.V1}
      orgId={process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID!}
      auth={{
        clientId: process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID!,
        redirectUrl: process.env.NEXT_PUBLIC_BUILDBASE_REDIRECT_URL!,
        callbacks: {
          getSession: async () => {
            const res = await fetch('/api/auth/session');
            return ((await res.json()) as { sessionId: string | null })
              .sessionId;
          },
          handleAuthentication: async (code: string) => {
            const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            const { sessionId } = (await res.json()) as { sessionId: string };
            return { sessionId };
          },
          onSignOut: async () => {
            await fetch('/api/auth/signout', { method: 'POST' });
          },
        },
      }}
    >
      {children}
    </SaaSOSProvider>
  );
}
