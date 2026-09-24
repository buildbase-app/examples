// Modified from ixartz/Next-js-Boilerplate: the user comes from BuildBase,
// read on the server with the session cookie.
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { bb } from '@/libs/BuildBase';

export const Hello = async () => {
  const t = await getTranslations('Dashboard');
  // The proxy only checks that the cookie exists; this proves it is valid.
  const user = await bb()
    .users.getProfile()
    .catch(() => null);
  if (!user) {
    redirect('/sign-in');
  }

  return (
    <>
      <p>
        {`👋 `}
        {t('hello_message', { email: user.email ?? '' })}
      </p>
      <p>{t('buildbase_message')}</p>
    </>
  );
};
