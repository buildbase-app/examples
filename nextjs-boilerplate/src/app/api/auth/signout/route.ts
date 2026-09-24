// Added for the BuildBase example.
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/libs/BuildBase';

export const POST = () => {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);

  return response;
};
