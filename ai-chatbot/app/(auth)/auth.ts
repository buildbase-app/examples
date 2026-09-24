// Modified from vercel/chatbot: NextAuth (credentials + guest users) is
// replaced by BuildBase hosted sign-in. `auth()` keeps its old shape, so every
// route that calls it is unchanged.
import "server-only";

import BuildBase from "@buildbase/sdk";
import { cookies } from "next/headers";
import { cache } from "react";

import { ensureUser } from "@/lib/db/queries";

export type UserType = "regular";

export type User = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  type: UserType;
};

export type Session = { user: User };

/** The httpOnly cookie that holds the BuildBase session ID. */
export const SESSION_COOKIE = "bb-session";

/** The public BuildBase API. Override it only if you self-host. */
export const SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ||
  "https://api.console.buildbase.app";

let client: ReturnType<typeof BuildBase> | undefined;

/** Server-side BuildBase client, acting as the signed-in user. */
export function bb() {
  client ??= BuildBase({
    serverUrl: SERVER_URL,
    orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID ?? "",
    getSessionId: async () =>
      (await cookies()).get(SESSION_COOKIE)?.value ?? null,
  });
  return client;
}

/**
 * The signed-in user, or null. BuildBase validates the session; the chat
 * database keeps its own User row (found or created by email) so chats,
 * votes and documents keep their existing foreign keys.
 *
 * Cached per request, so the ten routes that call it cost one profile read.
 */
export const auth = cache(async (): Promise<Session | null> => {
  if (!(await cookies()).get(SESSION_COOKIE)?.value) return null;

  const profile = await bb()
    .users.getProfile()
    .catch(() => null);
  if (!profile?.email) return null;

  const dbUser = await ensureUser(profile.email);
  return {
    user: {
      id: dbUser.id,
      email: profile.email,
      name: profile.name,
      image: profile.image ?? null,
      type: "regular",
    },
  };
});
