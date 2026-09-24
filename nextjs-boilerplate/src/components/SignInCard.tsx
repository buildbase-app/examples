'use client';

// Added for the BuildBase example: replaces Clerk's <SignIn /> and <SignUp />.
// Both go to the hosted page, which offers sign-in and sign-up side by side.
import { useSaaSAuth } from '@buildbase/sdk/react';
import { useEffect } from 'react';
import { useRouter } from '@/libs/I18nNavigation';

export const SignInCard = (props: { title: string; cta: string }) => {
  const { isAuthenticated, isLoading, isRedirecting, signIn } = useSaaSAuth();
  const router = useRouter();

  // The hosted page redirects back here with a code; the provider exchanges
  // it, and then we move on to the dashboard.
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  const busy = isLoading || isRedirecting || isAuthenticated;

  return (
    <div className="w-80 space-y-4 rounded-lg border border-gray-200 p-6 text-center shadow-sm">
      <h1 className="text-xl font-semibold">{props.title}</h1>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          await signIn();
        }}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {busy ? '…' : props.cta}
      </button>
      <p className="text-xs text-gray-500">Secured by BuildBase</p>
    </div>
  );
};
