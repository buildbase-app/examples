import './globals.css';

import type { Metadata } from 'next';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Next.js with BuildBase',
  description: 'Sign-in for a Next.js app, in the time it takes to deploy it.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
