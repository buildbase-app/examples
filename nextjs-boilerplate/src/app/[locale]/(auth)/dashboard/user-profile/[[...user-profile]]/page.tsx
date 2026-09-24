// Modified from ixartz/Next-js-Boilerplate: the BuildBase account screens
// replace Clerk's <UserProfile />.
import { setRequestLocale } from 'next-intl/server';
import { AccountPanel } from '@/components/AccountPanel';

export default async function UserProfilePage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return (
    <div className="my-6">
      <AccountPanel />
    </div>
  );
}
