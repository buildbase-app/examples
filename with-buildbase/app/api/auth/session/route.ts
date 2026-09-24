import { NextResponse } from 'next/server';

import { getSessionId } from '@/lib/session';

/** Lets the client restore the session after a refresh. */
export async function GET() {
  return NextResponse.json({ sessionId: await getSessionId() });
}
