// Modified from ixartz/Next-js-Boilerplate: Clerk's middleware is replaced by
// a BuildBase session-cookie check; Arcjet and i18n routing are unchanged.
import { detectBot } from '@arcjet/next';
import createMiddleware from 'next-intl/middleware';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import arcjet from '@/libs/Arcjet';
import { routing } from './libs/I18nRouting';

const handleI18nRouting = createMiddleware(routing);

// BuildBase: the dashboard needs the session cookie the sign-in flow sets.
// Pages still validate the session themselves; this only redirects.
const isProtectedRoute = (request: NextRequest) =>
  /^(\/[a-z]{2})?\/dashboard(\/|$)/u.test(request.nextUrl.pathname);

// Improve security with Arcjet
const aj = arcjet.withRule(
  detectBot({
    mode: 'LIVE',
    // Block all bots except the following
    allow: [
      // See https://docs.arcjet.com/bot-protection/identifying-bots
      'CATEGORY:SEARCH_ENGINE', // Allow search engines
      'CATEGORY:PREVIEW', // Allow preview links to show OG images
      'CATEGORY:MONITOR', // Allow uptime monitoring services
    ],
  }),
);

export default async function proxy(request: NextRequest, _event: NextFetchEvent) {
  // Verify the request with Arcjet
  // Use `process.env` instead of Env to reduce bundle size in middleware
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  if (isProtectedRoute(request) && !request.cookies.get('bb-session')) {
    const locale = request.nextUrl.pathname.match(/(\/.*)\/dashboard/u)?.at(1) ?? '';
    return NextResponse.redirect(new URL(`${locale}/sign-in`, request.url));
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/_next`, `/_vercel` or `monitoring`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: '/((?!_next|_vercel|monitoring|api|.*\\..*).*)',
};
