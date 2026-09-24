// Modified from nextjs/saas-starter: BuildBaseProvider replaces the SWR
// fallback that preloaded the user and team from Postgres.
import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';

import { BuildBaseProvider } from '@/components/buildbase-provider';

export const metadata: Metadata = {
  title: 'Next.js SaaS Starter with BuildBase',
  description:
    'Next.js SaaS starter with sign-in, teams and billing handled by BuildBase.',
};

export const viewport: Viewport = {
  maximumScale: 1,
};

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`bg-white dark:bg-gray-950 text-black dark:text-white ${manrope.className}`}
    >
      <body className="min-h-[100dvh] bg-gray-50">
        <BuildBaseProvider>{children}</BuildBaseProvider>
      </body>
    </html>
  );
}
