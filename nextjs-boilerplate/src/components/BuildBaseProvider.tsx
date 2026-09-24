'use client';

// Added for the BuildBase example: replaces ClerkProvider.
import '@buildbase/sdk/css';
import { ApiVersion } from '@buildbase/sdk';
import { SaaSOSProvider, useSaaSAuth, useSaaSWorkspaces } from '@buildbase/sdk/react';
import { useEffect } from 'react';
import { SessionResponseValidation } from '@/validations/AuthValidation';

const configured = Boolean(
  process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID && process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID,
);

// Shown until the BuildBase env vars are set, instead of a broken sign-in.
const SetupNotice = () => (
  <div className="mx-auto max-w-lg space-y-3 p-8">
    <h1 className="text-2xl font-semibold">Connect BuildBase</h1>
    <p className="text-sm text-gray-700">
      Set <code>NEXT_PUBLIC_BUILDBASE_ORG_ID</code>, <code>NEXT_PUBLIC_BUILDBASE_CLIENT_ID</code>,{' '}
      <code>BUILDBASE_CLIENT_SECRET</code> and <code>NEXT_PUBLIC_BUILDBASE_REDIRECT_URL</code>, then
      restart. The README walks through each one.
    </p>
  </div>
);

// Selects the signed-in user's first workspace. The SDK only fetches the list
// when asked, and the account page's workspace switcher does that; this
// fetches only if nothing has after a moment, since two concurrent fetches can
// leave the SDK's loading flag stuck.
const WorkspaceLoader = () => {
  const { isAuthenticated } = useSaaSAuth();
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace, workspaces, loading } =
    useSaaSWorkspaces();

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isAuthenticated && !workspaces?.length && !loading) {
        await fetchWorkspaces();
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [isAuthenticated, fetchWorkspaces, workspaces, loading]);

  useEffect(() => {
    if (!currentWorkspace && workspaces?.[0]) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace]);

  return null;
};

const readSessionId = async (res: Response) =>
  SessionResponseValidation.parse(await res.json()).sessionId ?? '';

export const BuildBaseProvider = (props: { children: React.ReactNode }) => {
  if (!configured) {
    return <SetupNotice />;
  }

  return (
    <SaaSOSProvider
      serverUrl={
        process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ?? 'https://api.console.buildbase.app'
      }
      version={ApiVersion.V1}
      orgId={process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID ?? ''}
      auth={{
        clientId: process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID ?? '',
        redirectUrl: process.env.NEXT_PUBLIC_BUILDBASE_REDIRECT_URL ?? '',
        callbacks: {
          getSession: async () => {
            const res = await fetch('/api/auth/session');
            const sessionId = await readSessionId(res);

            return sessionId || null;
          },
          handleAuthentication: async (code: string) => {
            const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            return { sessionId: await readSessionId(res) };
          },
          onSignOut: async () => {
            await fetch('/api/auth/signout', { method: 'POST' });
          },
        },
      }}
    >
      <WorkspaceLoader />
      {props.children}
    </SaaSOSProvider>
  );
};
