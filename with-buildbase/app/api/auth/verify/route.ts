import { NextResponse } from 'next/server';

import { SERVER_URL } from '@/lib/buildbase';
import { SESSION_COOKIE } from '@/lib/session';

/**
 * The hosted sign-in page redirects back with a one-time `code`. The SDK
 * posts it here, and we exchange it for a session on the server - the client
 * secret never reaches the browser.
 */
export async function POST(request: Request) {
  const { code } = (await request.json().catch(() => ({}))) as {
    code?: string;
  };
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const res = await fetch(`${SERVER_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      orgId: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID,
      clientId: process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID,
      clientSecret: process.env.BUILDBASE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 401 });
  }

  const { data } = (await res.json()) as { data: { sessionId: string } };
  const response = NextResponse.json({ sessionId: data.sessionId });
  response.cookies.set(SESSION_COOKIE, data.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
