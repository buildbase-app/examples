'use client';

import '@buildbase/sdk/css';

import { ApiVersion } from '@buildbase/sdk';
import {
  SaaSOSProvider,
  useSaaSAuth,
  useSaaSWorkspaces,
} from '@buildbase/sdk/react';
import { useEffect } from 'react';

const configured = Boolean(
  process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID &&
  process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID
);

/**
 * Selects the user's first workspace (their "team") once the list is in. The
 * TeamSwitcher in the dashboard fetches the list - that first fetch also
 * auto-creates a new user's workspace - but only auto-selects when it is
 * hidden, so pages that read currentWorkspace need this.
 *
 * Pages outside the dashboard (pricing) have no switcher, so the list is
 * fetched here too, but only when nothing has loaded it yet: two concurrent
 * fetches left the SDK's loading flag stuck and the switcher said "Loading"
 * forever.
 */
function WorkspaceLoader() {
  const { isAuthenticated } = useSaaSAuth();
  const {
    currentWorkspace,
    fetchWorkspaces,
    setCurrentWorkspace,
    workspaces,
    loading,
  } = useSaaSWorkspaces();
  useEffect(() => {
    if (!isAuthenticated) return;
    // Give a mounted TeamSwitcher the first chance to fetch.
    const timer = setTimeout(() => {
      if (!workspaces?.length && !loading) fetchWorkspaces();
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, fetchWorkspaces, workspaces, loading]);
  useEffect(() => {
    if (!currentWorkspace && workspaces?.length) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace]);
  return null;
}

function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 p-8">
      <h1 className="text-2xl font-semibold">Connect BuildBase</h1>
      <p className="text-sm text-gray-600">
        Set <code>NEXT_PUBLIC_BUILDBASE_ORG_ID</code>,{' '}
        <code>NEXT_PUBLIC_BUILDBASE_CLIENT_ID</code>,{' '}
        <code>BUILDBASE_CLIENT_SECRET</code> and{' '}
        <code>NEXT_PUBLIC_BUILDBASE_REDIRECT_URL</code>, then redeploy. The
        README walks through each one.
      </p>
    </main>
  );
}

/** Sign-in, teams (workspaces) and billing, from your BuildBase org. */
export function BuildBaseProvider({ children }: { children: React.ReactNode }) {
  if (!configured) return <SetupNotice />;
  return (
    <SaaSOSProvider
      serverUrl={
        process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ||
        'https://api.console.buildbase.app'
      }
      version={ApiVersion.V1}
      orgId={process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID ?? ''}
      auth={{
        clientId: process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID ?? '',
        redirectUrl: process.env.NEXT_PUBLIC_BUILDBASE_REDIRECT_URL ?? '',
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
      <WorkspaceLoader />
      {children}
    </SaaSOSProvider>
  );
}
