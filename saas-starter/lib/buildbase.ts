// Added for the BuildBase example: the server-side SDK client and session cookie.
import BuildBase from '@buildbase/sdk';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'bb-session';

/** The public BuildBase API. Override it only if you self-host. */
export const SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ||
  'https://api.console.buildbase.app';

let client: ReturnType<typeof BuildBase> | undefined;

/** Server-side client, acting as the signed-in user. */
export function bb() {
  client ??= BuildBase({
    serverUrl: SERVER_URL,
    orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID ?? '',
    getSessionId: async () =>
      (await cookies()).get(SESSION_COOKIE)?.value ?? null,
  });
  return client;
}
