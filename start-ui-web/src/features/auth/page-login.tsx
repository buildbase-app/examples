// Modified from BearStudio/start-ui-web: the email one-time code and GitHub
// buttons are replaced by BuildBase's hosted page, which offers sign-in and
// sign-up with whatever methods the org enables (see server/buildbase-auth.ts).
import { useTranslation } from 'react-i18next';

import { buttonVariants } from '@/components/ui/button';

import { envClient } from '@/env/client';
import { AUTH_SIGNUP_ENABLED } from '@/features/auth/config';

const I18N_KEY_PAGE_PREFIX = AUTH_SIGNUP_ENABLED
  ? ('auth:pageLoginWithSignUp' as const)
  : ('auth:pageLogin' as const);

export default function PageLogin({
  search,
}: {
  search: { redirect?: string };
}) {
  const { t } = useTranslation(['auth', 'common']);
  const configured = !!(
    envClient.VITE_BUILDBASE_ORG_ID && envClient.VITE_BUILDBASE_CLIENT_ID
  );
  const signInUrl = `/api/auth/buildbase/sign-in?${new URLSearchParams({
    redirectTo: search.redirect ?? '/',
  })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">
          {t(`${I18N_KEY_PAGE_PREFIX}.title`)}
        </h1>
      </div>
      <a
        href={configured ? signInUrl : undefined}
        aria-disabled={!configured}
        className={buttonVariants({
          size: 'lg',
          className: `w-full ${configured ? '' : 'pointer-events-none opacity-50'}`,
        })}
      >
        {t(`${I18N_KEY_PAGE_PREFIX}.loginWithSocial`, {
          provider: 'BuildBase',
        })}
      </a>
      {!configured && (
        <p className="text-center text-xs text-muted-foreground">
          Set VITE_BUILDBASE_ORG_ID, VITE_BUILDBASE_CLIENT_ID and
          BUILDBASE_CLIENT_SECRET to enable sign-in. The README walks through
          each one.
        </p>
      )}
    </div>
  );
}
