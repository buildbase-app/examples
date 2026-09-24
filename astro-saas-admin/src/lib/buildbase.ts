// Added for the BuildBase example. Who may use the admin, decided by BuildBase:
// people sign in on BuildBase's hosted page, and the admin belongs to one
// BuildBase workspace. Its admins and editors can change data, its viewers
// can only look, and nobody else gets in.
import { ApiVersion, AuthApi, BuildBase } from "@buildbase/sdk";

export interface BuildBaseEnv {
  BUILDBASE_SERVER_URL?: string;
  BUILDBASE_ORG_ID?: string;
  BUILDBASE_CLIENT_ID?: string;
  BUILDBASE_CLIENT_SECRET?: string;
  /** The BuildBase workspace whose members run this admin. */
  ADMIN_WORKSPACE_ID?: string;
}

export type Role = "admin" | "editor" | "viewer";

export interface Member {
  id: string;
  name?: string;
  email: string;
  /** Their role in the admin workspace, or null if they are not in it. */
  role: Role | null;
  /** Every workspace they belong to, so setup can show which ID to use. */
  workspaces: { id: string; name: string }[];
}

export const SESSION_COOKIE = "bb_session";
export const STATE_COOKIE = "bb_state";

/** The variables sign-in cannot work without, if any are unset. */
export function missingConfig(env: BuildBaseEnv): string[] {
  return (
    ["BUILDBASE_ORG_ID", "BUILDBASE_CLIENT_ID", "BUILDBASE_CLIENT_SECRET"] as const
  ).filter((key) => !env[key]);
}

/** Admins and editors change data; viewers only read. */
export const canWrite = (role: Role | null) =>
  role === "admin" || role === "editor";

/**
 * What a request may do. Pure, so it is tested on its own
 * (test/access.test.ts); the middleware only gathers the inputs.
 */
export function decide({
  pathname,
  method,
  apiToken,
  member,
}: {
  pathname: string;
  method: string;
  /** Whether the request carried the API_TOKEN, as upstream's API expects. */
  apiToken: boolean;
  member: Member | null;
}):
  | { allow: true }
  | { allow: false; status: 401 | 403; reason: "sign-in" | "not-a-member" | "read-only" } {
  const isApi = pathname.startsWith("/api/");
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isApi && !isAdmin) return { allow: true };
  // Machine clients keep working exactly as upstream: the token is full access.
  if (isApi && apiToken) return { allow: true };
  if (!member) return { allow: false, status: 401, reason: "sign-in" };
  if (!member.role) return { allow: false, status: 403, reason: "not-a-member" };
  if (isApi && method !== "GET" && !canWrite(member.role)) {
    return { allow: false, status: 403, reason: "read-only" };
  }
  return { allow: true };
}

// One SDK client per org. On Workers the env arrives with the request, so the
// client is made on first use.
const clients = new Map<string, ReturnType<typeof BuildBase>>();

export function buildbase(env: BuildBaseEnv) {
  const serverUrl = env.BUILDBASE_SERVER_URL || "https://api.console.buildbase.app";
  const orgId = env.BUILDBASE_ORG_ID ?? "";
  const clientId = env.BUILDBASE_CLIENT_ID ?? "";
  const authApi = new AuthApi({ serverUrl, version: ApiVersion.V1 });

  const forSession = (sessionId: string) => {
    let client = clients.get(`${serverUrl}|${orgId}`);
    if (!client) {
      client = BuildBase({ serverUrl, orgId });
      clients.set(`${serverUrl}|${orgId}`, client);
    }
    return client.withSession(sessionId);
  };

  return {
    /** The hosted sign-in URL. BuildBase returns to `callbackUrl` with `state`. */
    async signInUrl(state: string, callbackUrl: string) {
      const { redirectUrl } = await authApi.requestAuth({
        orgId,
        clientId,
        redirect: { success: callbackUrl, error: callbackUrl },
        state,
      });
      return redirectUrl;
    },

    /** Swaps the one-time code for a BuildBase session ID, with the client secret. */
    async exchangeCode(code: string) {
      const res = await fetch(`${serverUrl}/api/v1/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          orgId,
          clientId,
          clientSecret: env.BUILDBASE_CLIENT_SECRET,
        }),
      });
      if (!res.ok) throw new Error(`BuildBase token exchange failed (${res.status})`);
      const { data } = (await res.json()) as { data: { sessionId: string } };
      return data.sessionId;
    },

    /**
     * Who the session belongs to, and their role in the admin workspace.
     * Null when BuildBase no longer knows the session (signed out, revoked).
     */
    async member(sessionId: string): Promise<Member | null> {
      const bb = forSession(sessionId);
      let profile, workspaces;
      try {
        [profile, workspaces] = await Promise.all([bb.users.getProfile(), bb.workspace.list()]);
      } catch (err) {
        if ((err as { status?: number }).status === 401) return null;
        throw err;
      }
      const adminWorkspace = workspaces.find((w) => w._id === env.ADMIN_WORKSPACE_ID);
      let role: Role | null = null;
      if (adminWorkspace) {
        const members = await bb.users.list(adminWorkspace._id);
        const me = members.find((m) => {
          const user = m.user as string | { _id?: string; id?: string };
          const userId = typeof user === "string" ? user : (user._id ?? user.id);
          return Boolean(userId) && userId === (profile.id ?? profile._id);
        });
        role = (me?.role as Role | undefined) ?? null;
      }
      return {
        id: profile.id ?? profile._id ?? "",
        name: profile.name,
        email: profile.email,
        role,
        workspaces: workspaces.map((w) => ({ id: w._id, name: w.name })),
      };
    },

    /** Ends the BuildBase session itself, not just this app's cookie. */
    async revoke(sessionId: string) {
      await authApi.logout(sessionId).catch(() => {});
    },
  };
}
