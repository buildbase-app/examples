// Added for the BuildBase example.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/libs/BuildBase';

// Lets the client restore the session after a refresh.
export const GET = async () => {
  const cookieStore = await cookies();

  return NextResponse.json({ sessionId: cookieStore.get(SESSION_COOKIE)?.value ?? null });
};
