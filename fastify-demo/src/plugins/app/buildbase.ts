import fp from 'fastify-plugin'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { ApiVersion, AuthApi, BuildBase } from '@buildbase/sdk'

/**
 * Added for the BuildBase example. Sign-in happens on BuildBase's hosted
 * pages, and everything after it goes through the server SDK. This replaces
 * the email and password login and the scrypt password manager.
 *
 * Routes talk to this small interface rather than to the SDK directly, so the
 * tests can pass a fake through the plugin options (see test/helper.ts).
 */
export interface BuildBaseProfile {
  id: string;
  email: string;
  name?: string;
}

export interface BuildBaseAccount {
  profile: BuildBaseProfile;
  workspace: { id: string; name: string } | null;
  credits: number | null;
}

export interface BuildBaseGateway {
  /** The hosted sign-in URL. BuildBase sends the visitor back with `state`. */
  signInUrl (state: string): Promise<string>;
  /** Swaps the one-time code for a BuildBase session ID. Needs the client secret. */
  exchangeCode (code: string): Promise<string>;
  profile (sessionId: string): Promise<BuildBaseProfile>;
  account (sessionId: string): Promise<BuildBaseAccount>;
  /** Spends credits from the user's workspace. Throws `code: 'INSUFFICIENT_CREDITS'` when empty. */
  spend (sessionId: string, amount: number, description: string, idempotencyKey: string): Promise<{ balanceAfter: number }>;
  /** Ends the BuildBase session itself, not just this app's cookie. */
  revoke (sessionId: string): Promise<void>;
}

declare module 'fastify' {
  interface FastifyInstance {
    buildbase: BuildBaseGateway;
  }
}

function createGateway (fastify: FastifyInstance): BuildBaseGateway {
  const { BUILDBASE_SERVER_URL, BUILDBASE_ORG_ID, BUILDBASE_CLIENT_ID, BUILDBASE_CLIENT_SECRET, APP_URL } = fastify.config
  const callbackUrl = `${APP_URL}/api/auth/buildbase/callback`
  const authApi = new AuthApi({ serverUrl: BUILDBASE_SERVER_URL, version: ApiVersion.V1 })

  // Made on first use: BuildBase() refuses to start without an org ID, and the
  // API should still boot, serve its docs and say what is missing.
  let client: ReturnType<typeof BuildBase> | undefined
  const forSession = (sessionId: string) => {
    if (!BUILDBASE_ORG_ID || !BUILDBASE_CLIENT_ID || !BUILDBASE_CLIENT_SECRET) {
      throw Object.assign(
        new Error('BuildBase is not configured. Set BUILDBASE_ORG_ID, BUILDBASE_CLIENT_ID and BUILDBASE_CLIENT_SECRET.'),
        { code: 'BUILDBASE_NOT_CONFIGURED' }
      )
    }
    client ??= BuildBase({ serverUrl: BUILDBASE_SERVER_URL, orgId: BUILDBASE_ORG_ID })
    // Fastify has no async request context, so bind the session per call.
    return client.withSession(sessionId)
  }

  // The user's first workspace, which BuildBase creates on first sign-in.
  const firstWorkspace = async (sessionId: string) => {
    const [workspace] = await forSession(sessionId).workspace.list()
    return workspace ?? null
  }

  return {
    async signInUrl (state) {
      forSession('') // fail early with the setup message
      const { redirectUrl } = await authApi.requestAuth({
        orgId: BUILDBASE_ORG_ID,
        clientId: BUILDBASE_CLIENT_ID,
        redirect: { success: callbackUrl, error: callbackUrl },
        state
      })
      return redirectUrl
    },

    async exchangeCode (code) {
      const res = await fetch(`${BUILDBASE_SERVER_URL}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          orgId: BUILDBASE_ORG_ID,
          clientId: BUILDBASE_CLIENT_ID,
          clientSecret: BUILDBASE_CLIENT_SECRET
        })
      })
      if (!res.ok) throw new Error(`BuildBase token exchange failed (${res.status})`)
      const { data } = await res.json() as { data: { sessionId: string } }
      return data.sessionId
    },

    async profile (sessionId) {
      const user = await forSession(sessionId).users.getProfile()
      if (!user.id) throw new Error('BuildBase returned a profile without an ID.')
      return { id: user.id, email: user.email, name: user.name }
    },

    async account (sessionId) {
      const [profile, workspace] = await Promise.all([this.profile(sessionId), firstWorkspace(sessionId)])
      const balance = workspace
        ? await forSession(sessionId).credits.getBalance(workspace._id).catch(() => null)
        : null
      return {
        profile,
        workspace: workspace ? { id: workspace._id, name: workspace.name } : null,
        credits: balance?.available ?? null
      }
    },

    async spend (sessionId, amount, description, idempotencyKey) {
      const workspace = await firstWorkspace(sessionId)
      if (!workspace) {
        throw Object.assign(new Error('No BuildBase workspace yet.'), { code: 'NO_WORKSPACE' })
      }
      const { balanceAfter } = await forSession(sessionId).credits.consume(workspace._id, {
        amount,
        description,
        idempotencyKey
      })
      return { balanceAfter }
    },

    async revoke (sessionId) {
      await authApi.logout(sessionId).catch(() => {})
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance, opts: FastifyPluginOptions) {
    fastify.decorate('buildbase', (opts.buildbase as BuildBaseGateway | undefined) ?? createGateway(fastify))
  },
  { name: 'buildbase' }
)
