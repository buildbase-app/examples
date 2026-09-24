// Modified from vercel/chatbot: signed-out visitors go to /welcome (BuildBase
// hosted sign-in) instead of being given an anonymous guest account.
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "bb-session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/welcome")) {
    return NextResponse.next();
  }

  // The cookie is only a hint; every route still validates the session via
  // auth(). This just sends signed-out visitors somewhere useful.
  if (!request.cookies.get(SESSION_COOKIE)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const url = new URL(`${base}/welcome`, request.url);
    url.searchParams.set("redirectUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
