import { ApiVersion, AuthApi, BuildBase } from '@buildbase/sdk'

/**
 * Everything this app asks of BuildBase, in one place. Routes use this
 * interface rather than the SDK directly, so the tests can hand the app a fake.
 *
 * The SDK's root export uses only fetch and other Web APIs, which is why the
 * same code runs on Node, Bun, Deno and Cloudflare Workers.
 */
export type Env = {
  BUILDBASE_SERVER_URL?: string
  BUILDBASE_ORG_ID?: string
  BUILDBASE_CLIENT_ID?: string
  BUILDBASE_CLIENT_SECRET?: string
  /** Signs the session cookies. Any long random string. */
  COOKIE_SECRET?: string
  /** Optional. Where the app is served; defaults to the request's origin. */
  APP_URL?: string
}

export interface Account {
  profile: { id: string; email: string; name?: string }
  workspace: { id: string; name: string } | null
  credits: number | null
}

export interface BuildBaseGateway {
  /** The hosted sign-in URL. BuildBase sends the visitor back to `callbackUrl` with `state`. */
  signInUrl(state: string, callbackUrl: string): Promise<string>
  /** Swaps the one-time code for a BuildBase session ID. Needs the client secret. */
  exchangeCode(code: string): Promise<string>
  account(sessionId: string): Promise<Account>
  /** Spends credits from the user's workspace. Throws `code: 'INSUFFICIENT_CREDITS'` when it is empty. */
  spend(sessionId: string, amount: number, idempotencyKey: string): Promise<{ balanceAfter: number }>
  /** Ends the BuildBase session itself, not just this app's cookie. */
  revoke(sessionId: string): Promise<void>
}

export const DEFAULT_SERVER_URL = 'https://api.console.buildbase.app'

/** The variables sign-in cannot work without, if any are unset. */
export function missingConfig(env: Env): string[] {
  return (['BUILDBASE_ORG_ID', 'BUILDBASE_CLIENT_ID', 'BUILDBASE_CLIENT_SECRET', 'COOKIE_SECRET'] as const).filter(
    (key) => !env[key],
  )
}

// One SDK client per org and server. A Worker gets its env per request, so
// the client is made on first use rather than at import time.
const clients = new Map<string, ReturnType<typeof BuildBase>>()

export function buildbaseFor(env: Env): BuildBaseGateway {
  const serverUrl = env.BUILDBASE_SERVER_URL || DEFAULT_SERVER_URL
  const orgId = env.BUILDBASE_ORG_ID ?? ''
  const clientId = env.BUILDBASE_CLIENT_ID ?? ''
  const authApi = new AuthApi({ serverUrl, version: ApiVersion.V1 })

  const forSession = (sessionId: string) => {
    const key = `${serverUrl}|${orgId}`
    let client = clients.get(key)
    if (!client) {
      client = BuildBase({ serverUrl, orgId })
      clients.set(key, client)
    }
    // No async request context to lean on, so bind the session per call.
    return client.withSession(sessionId)
  }

  // The user's first workspace, which BuildBase creates on sign-up.
  const firstWorkspace = async (sessionId: string) => {
    const [workspace] = await forSession(sessionId).workspace.list()
    return workspace ?? null
  }

  return {
    async signInUrl(state, callbackUrl) {
      const { redirectUrl } = await authApi.requestAuth({
        orgId,
        clientId,
        redirect: { success: callbackUrl, error: callbackUrl },
        state,
      })
      return redirectUrl
    },

    async exchangeCode(code) {
      const res = await fetch(`${serverUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orgId, clientId, clientSecret: env.BUILDBASE_CLIENT_SECRET }),
      })
      if (!res.ok) throw new Error(`BuildBase token exchange failed (${res.status})`)
      const { data } = (await res.json()) as { data: { sessionId: string } }
      return data.sessionId
    },

    async account(sessionId) {
      const bb = forSession(sessionId)
      const [user, workspace] = await Promise.all([bb.users.getProfile(), firstWorkspace(sessionId)])
      const balance = workspace ? await bb.credits.getBalance(workspace._id).catch(() => null) : null
      return {
        profile: { id: user.id ?? '', email: user.email, name: user.name },
        workspace: workspace ? { id: workspace._id, name: workspace.name } : null,
        credits: balance?.available ?? null,
      }
    },

    async spend(sessionId, amount, idempotencyKey) {
      const workspace = await firstWorkspace(sessionId)
      if (!workspace) throw Object.assign(new Error('No workspace yet.'), { code: 'NO_WORKSPACE' })
      const { balanceAfter } = await forSession(sessionId).credits.consume(workspace._id, {
        amount,
        description: 'Hono example',
        idempotencyKey,
      })
      return { balanceAfter }
    },

    async revoke(sessionId) {
      await authApi.logout(sessionId).catch(() => {})
    },
  }
}
