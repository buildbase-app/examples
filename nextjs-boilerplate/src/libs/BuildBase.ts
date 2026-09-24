// Added for the BuildBase example: the server-side SDK client and the session
// cookie the sign-in flow sets.
import BuildBase from '@buildbase/sdk';
import { cookies } from 'next/headers';
import { Env } from './Env';

export const SESSION_COOKIE = 'bb-session';

let client: ReturnType<typeof BuildBase> | undefined;

// Server-side client, acting as the signed-in user.
export const bb = () => {
  client ??= BuildBase({
    serverUrl: Env.NEXT_PUBLIC_BUILDBASE_SERVER_URL,
    orgId: Env.NEXT_PUBLIC_BUILDBASE_ORG_ID ?? '',
    getSessionId: async () => {
      const cookieStore = await cookies();

      return cookieStore.get(SESSION_COOKIE)?.value ?? null;
    },
  });
  return client;
};
