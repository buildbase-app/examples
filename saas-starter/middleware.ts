// Modified from nextjs/saas-starter: the JWT session check is replaced by the
// BuildBase session cookie. Routes still validate the session themselves; this
// only sends signed-out visitors to /sign-in.
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !request.cookies.get('bb-session')
  ) {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
