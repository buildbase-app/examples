"use client";

import { useSaaSAuth } from "@buildbase/sdk/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { Button } from "@/components/ui/button";

function SignIn() {
  const { isAuthenticated, isLoading, isRedirecting, signIn } = useSaaSAuth();
  const router = useRouter();
  const next = useSearchParams().get("redirectUrl") || "/";

  // Back from the hosted sign-in page: the provider has set the session.
  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  return (
    <Button
      className="w-full"
      disabled={isLoading || isRedirecting || isAuthenticated}
      onClick={() => signIn(next)}
    >
      {isRedirecting ? "Redirecting..." : "Sign in or create an account"}
    </Button>
  );
}

export default function Page() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
      <p className="text-sm text-muted-foreground">
        Sign in to start chatting. New accounts get free credits to try it out.
      </p>
      <div className="mt-6">
        <Suspense>
          <SignIn />
        </Suspense>
      </div>
    </>
  );
}
