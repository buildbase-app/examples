import Link from 'next/link';
import { redirect } from 'next/navigation';

import { bb } from '@/lib/buildbase';
import { isConfigured } from '@/lib/config';
import { getSessionId } from '@/lib/session';

// Reads the session cookie on every request; never cache this page.
export const dynamic = 'force-dynamic';

/**
 * A server component reading the signed-in user. The session travels in an
 * httpOnly cookie, so this works without any client-side state - the same
 * pattern protects a route handler or a server action.
 */
export default async function ProfilePage() {
  if (!isConfigured || !(await getSessionId())) redirect('/');

  const profile = await bb()
    .users.getProfile()
    .catch(() => null);
  // An expired or revoked session fails here; send the visitor back to sign in.
  if (!profile) redirect('/');

  return (
    <main>
      <h1>Your profile</h1>
      <p className="lede">Fetched on the server with the BuildBase SDK.</p>
      <section className="card">
        <dl>
          <dt>Name</dt>
          <dd>{profile.name}</dd>
          <dt>Email</dt>
          <dd>{profile.email}</dd>
          <dt>User ID</dt>
          <dd>
            {/* /profile returns the id as `id`; the SDK's IUser type says `_id`. */}
            <code>{(profile as { id?: string }).id ?? profile._id}</code>
          </dd>
        </dl>
      </section>
      <Link href="/">Back</Link>
    </main>
  );
}
