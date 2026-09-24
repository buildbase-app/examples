// Added for the BuildBase example.
import { NextResponse } from 'next/server';
import * as z from 'zod';
import { SESSION_COOKIE } from '@/libs/BuildBase';
import { Env } from '@/libs/Env';
import { TokenResponseValidation, VerifyValidation } from '@/validations/AuthValidation';

// The hosted sign-in page redirects back with a one-time `code`. The SDK posts
// it here, and we exchange it for a session on the server, so the client
// secret never reaches the browser.
export const POST = async (request: Request) => {
  const parse = VerifyValidation.safeParse(await request.json());

  if (!parse.success) {
    return NextResponse.json(z.treeifyError(parse.error), { status: 422 });
  }

  const res = await fetch(`${Env.NEXT_PUBLIC_BUILDBASE_SERVER_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: parse.data.code,
      orgId: Env.NEXT_PUBLIC_BUILDBASE_ORG_ID,
      clientId: Env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID,
      clientSecret: Env.BUILDBASE_CLIENT_SECRET,
    }),
  });
  const token = TokenResponseValidation.safeParse(res.ok ? await res.json() : null);

  if (!token.success) {
    return NextResponse.json({ error: 'Sign-in failed' }, { status: 401 });
  }

  const { sessionId } = token.data.data;
  const response = NextResponse.json({ sessionId });
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
};
