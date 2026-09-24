"use client";

import "@buildbase/sdk/css";

import { ApiVersion } from "@buildbase/sdk";
import { SaaSOSProvider } from "@buildbase/sdk/react";

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
      {children}
    </SaaSOSProvider>
  );
}
