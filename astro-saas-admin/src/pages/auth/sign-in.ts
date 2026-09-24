// Added for the BuildBase example: step 1 of signing in. Remember a random
// state and where to land, then go to BuildBase's hosted page.
import type { APIContext } from "astro";
import { buildbase, missingConfig, STATE_COOKIE, type BuildBaseEnv } from "@/lib/buildbase";

/** Only same-site paths, so the sign-in cannot be used to bounce elsewhere. */
const safeNext = (next: string | null) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin";

export async function GET({ locals, url, cookies, redirect }: APIContext) {
  const env = locals.runtime.env as unknown as BuildBaseEnv;
  if (missingConfig(env).length) return redirect("/access");
  const state = crypto.randomUUID();
  cookies.set(STATE_COOKIE, JSON.stringify({ state, next: safeNext(url.searchParams.get("next")) }), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/auth",
    maxAge: 600,
  });
  return redirect(await buildbase(env).signInUrl(state, `${url.origin}/auth/callback`));
}
