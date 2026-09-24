// Added for the BuildBase example: ends the BuildBase session too.
import type { APIContext } from "astro";
import { buildbase, SESSION_COOKIE, type BuildBaseEnv } from "@/lib/buildbase";

export async function POST({ locals, cookies, redirect }: APIContext) {
  const sessionId = cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) await buildbase(locals.runtime.env as unknown as BuildBaseEnv).revoke(sessionId);
  cookies.delete(SESSION_COOKIE, { path: "/" });
  return redirect("/");
}
