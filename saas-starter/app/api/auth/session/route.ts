import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { SESSION_COOKIE } from '@/lib/buildbase';

export async function GET() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return NextResponse.json({ sessionId });
}
