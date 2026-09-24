// Added for the BuildBase example.
import { NextResponse } from "next/server";
import { getSessionId } from "../../../../lib/buildbase";

export const dynamic = "force-dynamic";

/** Lets the client restore the session after a refresh. */
export async function GET() {
  return NextResponse.json({ sessionId: getSessionId() });
}
