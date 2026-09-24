// Modified from ixartz/Next-js-Boilerplate: BuildBaseProvider replaces ClerkProvider.
import { setRequestLocale } from 'next-intl/server';
import { BuildBaseProvider } from '@/components/BuildBaseProvider';

export default async function AuthLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <BuildBaseProvider>{props.children}</BuildBaseProvider>;
}
