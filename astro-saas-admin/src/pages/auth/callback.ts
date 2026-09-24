// Added for the BuildBase example: step 2. BuildBase returns with a one-time
// code; check the state, swap the code for a session on the server, and keep
// the BuildBase session ID in an httpOnly cookie. The middleware asks
// BuildBase about it on every request, so it cannot be forged.
import type { APIContext } from "astro";
import { buildbase, SESSION_COOKIE, STATE_COOKIE, type BuildBaseEnv } from "@/lib/buildbase";

export async function GET({ locals, url, cookies, redirect }: APIContext) {
  const env = locals.runtime.env as unknown as BuildBaseEnv;
  const saved = cookies.get(STATE_COOKIE)?.json() as { state?: string; next?: string } | undefined;
  cookies.delete(STATE_COOKIE, { path: "/auth" });
  const code = url.searchParams.get("code");
  if (!code || !saved?.state || url.searchParams.get("state") !== saved.state) {
    return redirect("/access?error=sign-in");
  }
  const sessionId = await buildbase(env).exchangeCode(code);
  cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return redirect(saved.next ?? "/admin");
}
