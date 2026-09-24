import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/app/(auth)/auth";

/** Lets the client restore the session after a refresh. */
export async function GET() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return NextResponse.json({ sessionId });
}
