import { cookies } from 'next/headers';

/** The httpOnly cookie that holds the BuildBase session ID. */
export const SESSION_COOKIE = 'bb-session';

export async function getSessionId(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
