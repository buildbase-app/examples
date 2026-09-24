'use client';

// Modified from nextjs/saas-starter: one page replaces the email/password
// sign-in and sign-up forms. BuildBase's hosted page does both, and returns
// here with a one-time code the SDK exchanges for a session.
import { useSaaSAuth } from '@buildbase/sdk/react';
import { CircleIcon, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { Button } from '@/components/ui/button';

function SignIn() {
  const { isAuthenticated, isLoading, isRedirecting, signIn } = useSaaSAuth();
  const router = useRouter();
  const next = useSearchParams().get('redirect') || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  const busy = isLoading || isRedirecting || isAuthenticated;
  return (
    <Button
      className="w-full rounded-full"
      disabled={busy}
      onClick={() => signIn(next)}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Sign in or create an account
    </Button>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CircleIcon className="h-12 w-12 text-orange-500" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          New here? The same button creates your account and your team.
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense>
          <SignIn />
        </Suspense>
      </div>
    </div>
  );
}
