import BuildBase from '@buildbase/sdk';

import { getSessionId } from './session';

/** The public BuildBase API. Override it only if you self-host. */
export const SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ||
  'https://api.console.buildbase.app';

let client: ReturnType<typeof BuildBase> | undefined;

/**
 * Server-side client, created on first use rather than at import, so the app
 * still builds before its env vars are filled in. Every call carries the
 * session from the cookie, so a server component or route handler acts as the
 * signed-in user.
 */
export function bb() {
  client ??= BuildBase({
    serverUrl: SERVER_URL,
    orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID!,
    getSessionId,
  });
  return client;
}
