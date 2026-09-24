import { isConfigured } from '@/lib/config';

import { AuthPanel } from './auth-panel';

export default function Home() {
  return (
    <main>
      <h1>Next.js with BuildBase</h1>
      <p className="lede">
        Sign-in for a Next.js app, handled by a hosted page on your own
        BuildBase org.
      </p>

      {isConfigured ? (
        <AuthPanel />
      ) : (
        <section className="card">
          <h2>Almost there</h2>
          <p>
            Copy <code>.env.local.example</code> to <code>.env.local</code> and
            fill in your org ID and auth client from the{' '}
            <a href="https://console.buildbase.app">BuildBase console</a>, then
            restart the dev server. The README lists each value and where to
            find it.
          </p>
        </section>
      )}

      <footer>
        <a href="https://docs.buildbase.app">Docs</a>
        <a href="https://github.com/buildbase-app/examples">More examples</a>
      </footer>
    </main>
  );
}
