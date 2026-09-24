// Added for the BuildBase example: the server-side SDK client, acting as the
// signed-in user through the session cookie.
import BuildBase from "@buildbase/sdk";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "bb-session";

export const SERVER_URL =
  process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL ||
  "https://api.console.buildbase.app";

export function getSessionId(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

let client: ReturnType<typeof BuildBase> | undefined;

export function bb() {
  client ??= BuildBase({
    serverUrl: SERVER_URL,
    orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID ?? "",
    getSessionId: async () => getSessionId(),
  });
  return client;
}
