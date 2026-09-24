// Added for the BuildBase example: the React SDK, for its prebuilt account
// screens. Sign-in happens on the server (server/buildbase-auth.ts); the SDK
// only picks up the BuildBase session that better-auth's session carries.
import { ApiVersion, clearAuthIntent } from '@buildbase/sdk';
import {
  SaaSOSProvider,
  useSaaSAuth,
  useSaaSWorkspaces,
} from '@buildbase/sdk/react';
import { type ReactNode, useEffect, useRef } from 'react';
import '@buildbase/sdk/css';

import { envClient } from '@/env/client';
import { authClient } from '@/features/auth/client';

/**
 * The SDK's account screens open for a workspace, and the SDK fetches the
 * list only when asked: fetch it once per sign-in and select the first.
 */
function WorkspaceLoader() {
  const { isAuthenticated } = useSaaSAuth();
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace, workspaces } =
    useSaaSWorkspaces();
  const fetched = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      fetched.current = false;
    } else if (!fetched.current) {
      fetched.current = true;
      void fetchWorkspaces();
    }
  }, [isAuthenticated, fetchWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace && workspaces?.[0]) {
      void setCurrentWorkspace(workspaces[0]);
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace]);

  return null;
}

export const BuildBaseProvider = (props: { children: ReactNode }) => {
  const orgId = envClient.VITE_BUILDBASE_ORG_ID;
  const clientId = envClient.VITE_BUILDBASE_CLIENT_ID;
  if (!orgId || !clientId) return <>{props.children}</>;
  // The SDK remembers any page it saw signed out as "where to return after
  // sign-in", and jumps there when it next finds a session. The server
  // already returns people to the right page, so drop that memory first.
  if (typeof window !== 'undefined') clearAuthIntent();

  return (
    <SaaSOSProvider
      serverUrl={envClient.VITE_BUILDBASE_SERVER_URL}
      version={ApiVersion.V1}
      orgId={orgId}
      auth={{
        clientId,
        redirectUrl: '/api/auth/buildbase/callback',
        callbacks: {
          getSession: async () => {
            const { data } = await authClient.getSession();
            return (
              (data?.session as { buildbaseSessionId?: string } | undefined)
                ?.buildbaseSessionId ?? null
            );
          },
          // Never reached: better-auth's plugin exchanges the code.
          handleAuthentication: async () => ({ sessionId: '' }),
          // Signing out is better-auth's sign-out, which ends both sessions.
          onSignOut: async () => {},
        },
      }}
    >
      <WorkspaceLoader />
      {props.children}
    </SaaSOSProvider>
  );
};
