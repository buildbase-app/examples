"use client";

import "@buildbase/sdk/css";

import { ApiVersion } from "@buildbase/sdk";
import {
  SaaSOSProvider,
  useSaaSAuth,
  useSaaSWorkspaces,
} from "@buildbase/sdk/react";
import { useEffect } from "react";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const configured = Boolean(
  process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID &&
    process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID
);

/** Shown until the BuildBase env vars are set, instead of a broken app. */
function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        Connect BuildBase
      </h1>
      <p className="text-sm text-muted-foreground">
        Set <code>NEXT_PUBLIC_BUILDBASE_ORG_ID</code>,{" "}
        <code>NEXT_PUBLIC_BUILDBASE_CLIENT_ID</code>,{" "}
        <code>BUILDBASE_CLIENT_SECRET</code> and{" "}
        <code>NEXT_PUBLIC_BUILDBASE_REDIRECT_URL</code>, then redeploy. The
        README walks through each one.
      </p>
    </main>
  );
}

/**
 * Loads the signed-in user's workspaces and selects one. Nothing else in this
 * app renders a workspace switcher, and the SDK only fetches the list when
 * asked. The first fetch is also what creates a new user's first workspace
 * (with auto-create on), which fires the "Workspace Created" workflow that
 * grants the starting credits.
 */
function WorkspaceLoader() {
  const { isAuthenticated } = useSaaSAuth();
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace, workspaces } =
    useSaaSWorkspaces();

  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    }
  }, [isAuthenticated, fetchWorkspaces]);

  useEffect(() => {
    if (!currentWorkspace && workspaces?.length) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace]);

  return null;
}

/** Connects the app to your BuildBase org: sign-in, workspaces and credits. */
export function BuildBaseProvider({ children }: { children: React.ReactNode }) {
  if (!configured) {
    return <SetupNotice />;
  }

  return (
    <SaaSOSProvider
      auth={{
        callbacks: {
          getSession: async () => {
            const res = await fetch(`${base}/api/auth/session`);
            return ((await res.json()) as { sessionId: string | null })
              .sessionId;
          },
          handleAuthentication: async (code: string) => {
            const res = await fetch(`${base}/api/auth/verify`, {
              body: JSON.stringify({ code }),
              headers: { "Content-Type": "application/json" },
              method: "POST",
            });
            const { sessionId } = (await res.json()) as { sessionId: string };
            return { sessionId };
          },
          onSignOut: async () => {
            await fetch(`${base}/api/auth/signout`, { method: "POST" });
          },
        },
        clientId: process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID ?? "",
        redirectUrl: process.env.NEXT_PUBLIC_BUILDBASE_REDIRECT_URL ?? "",
      }}
      orgId={process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID ?? ""}
      serverUrl={
        process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ||
        "https://api.console.buildbase.app"
      }
      version={ApiVersion.V1}
    >
      <WorkspaceLoader />
      {children}
    </SaaSOSProvider>
  );
}
