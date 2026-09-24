// Added for the BuildBase example. Upstream leaves /admin open to anyone and
// guards /api with a single API_TOKEN. Here every /admin page and /api call is
// checked: signed in through BuildBase, a member of the admin workspace, and
// allowed to write for anything but GET. API_TOKEN still works for machines.
import { defineMiddleware } from "astro:middleware";
import { validateApiToken } from "@/lib/api";
import {
  buildbase,
  decide,
  missingConfig,
  SESSION_COOKIE,
  type BuildBaseEnv,
} from "@/lib/buildbase";

export const onRequest = defineMiddleware(async (context, next) => {
  const env = context.locals.runtime.env as unknown as BuildBaseEnv & { API_TOKEN?: string };
  const { pathname } = context.url;
  const sessionId = context.cookies.get(SESSION_COOKIE)?.value;

  context.locals.member = null;
  if (sessionId && !missingConfig(env).length) {
    context.locals.member = await buildbase(env).member(sessionId);
    // BuildBase ended the session (signed out elsewhere, revoked): drop ours.
    if (!context.locals.member) context.cookies.delete(SESSION_COOKIE, { path: "/" });
  }

  const apiToken =
    pathname.startsWith("/api/") && Boolean(env.API_TOKEN) &&
    (await validateApiToken(context.request, env.API_TOKEN));

  const verdict = decide({
    pathname,
    method: context.request.method,
    apiToken,
    member: context.locals.member,
  });
  if (verdict.allow) return next();

  if (pathname.startsWith("/api/")) {
    const message = {
      "sign-in": "Sign in, or send the API token.",
      "not-a-member": "You are not a member of this admin's workspace.",
      "read-only": "Viewers can read, not change.",
    }[verdict.reason];
    return Response.json({ message }, { status: verdict.status });
  }
  if (verdict.reason === "sign-in" && !missingConfig(env).length) {
    return context.redirect(`/auth/sign-in?next=${encodeURIComponent(pathname)}`);
  }
  return context.redirect("/access");
});
