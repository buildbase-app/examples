import { Hono, type Context } from 'hono'
import { env, getRuntimeKey } from 'hono/adapter'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { csrf } from 'hono/csrf'
import type { FC, PropsWithChildren } from 'hono/jsx'
import { buildbaseFor, missingConfig, type Account, type BuildBaseGateway, type Env } from './buildbase.ts'

const SESSION_COOKIE = 'bb_session'
const STATE_COOKIE = 'bb_state'

const RUNTIMES: Record<string, string> = {
  node: 'Node.js',
  bun: 'Bun',
  deno: 'Deno',
  workerd: 'Cloudflare Workers',
}

type App = { Bindings: Env }

/**
 * The whole app. Each runtime's entry file (node.ts, bun.ts, deno.ts,
 * worker.ts) only hands it to that runtime's server. `gatewayFor` is swapped
 * for a fake in the tests.
 */
export function createApp(gatewayFor: (env: Env) => BuildBaseGateway = buildbaseFor) {
  const app = new Hono<App>()

  const config = (c: Context<App>) => env<Env>(c)
  const secure = (c: Context<App>) => new URL(c.req.url).protocol === 'https:'
  const origin = (c: Context<App>) => config(c).APP_URL || new URL(c.req.url).origin

  /** The signed-in user's BuildBase session ID, if the cookie is present and untampered. */
  const sessionOf = async (c: Context<App>) => {
    const secret = config(c).COOKIE_SECRET
    if (!secret) return undefined
    return (await getSignedCookie(c, secret, SESSION_COOKIE)) || undefined
  }

  /** The user's account, or null when the session is gone (revoked, expired) or never was. */
  const accountOf = async (c: Context<App>, sessionId?: string): Promise<Account | null> => {
    if (!sessionId) return null
    try {
      return await gatewayFor(config(c)).account(sessionId)
    } catch (err) {
      if ((err as { status?: number }).status === 401) {
        deleteCookie(c, SESSION_COOKIE, { path: '/' })
        return null
      }
      throw err
    }
  }

  // Rejects cross-site form posts. That includes a POST with no content type,
  // so API callers send JSON: other sites cannot, without a CORS preflight.
  app.use(csrf())

  app.get('/', async (c) => {
    const missing = missingConfig(config(c))
    const account = missing.length ? null : await accountOf(c, await sessionOf(c))
    return c.html(
      <Page>
        {missing.length ? (
          <Setup missing={missing} />
        ) : account ? (
          <SignedIn account={account} spent={c.req.query('spent')} error={c.req.query('error')} />
        ) : (
          <SignedOut error={c.req.query('error')} />
        )}
      </Page>,
    )
  })

  // Step 1: remember a random state in a signed cookie, then go to BuildBase.
  app.get('/auth/sign-in', async (c) => {
    const cfg = config(c)
    const missing = missingConfig(cfg)
    if (missing.length) return c.text(`BuildBase is not configured. Set ${missing.join(', ')}.`, 503)
    const state = crypto.randomUUID()
    await setSignedCookie(c, STATE_COOKIE, state, cfg.COOKIE_SECRET!, {
      httpOnly: true,
      secure: secure(c),
      sameSite: 'Lax',
      path: '/auth',
      maxAge: 600,
    })
    return c.redirect(await gatewayFor(cfg).signInUrl(state, `${origin(c)}/auth/callback`))
  })

  // Step 2: BuildBase returns with a one-time code. Check the state, swap the
  // code for a session on the server, and keep the session in a signed cookie.
  app.get('/auth/callback', async (c) => {
    const cfg = config(c)
    const { code, state, error } = c.req.query()
    const expected = cfg.COOKIE_SECRET ? await getSignedCookie(c, cfg.COOKIE_SECRET, STATE_COOKIE) : undefined
    deleteCookie(c, STATE_COOKIE, { path: '/auth' })
    if (error || !code || !state || state !== expected) {
      return c.redirect(`/?error=${encodeURIComponent(error || 'sign-in-not-verified')}`)
    }
    const sessionId = await gatewayFor(cfg).exchangeCode(code)
    await setSignedCookie(c, SESSION_COOKIE, sessionId, cfg.COOKIE_SECRET!, {
      httpOnly: true,
      secure: secure(c),
      sameSite: 'Lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return c.redirect('/')
  })

  app.post('/auth/sign-out', async (c) => {
    const sessionId = await sessionOf(c)
    if (sessionId) await gatewayFor(config(c)).revoke(sessionId)
    deleteCookie(c, SESSION_COOKIE, { path: '/' })
    return c.redirect('/')
  })

  // The form on the home page. The idempotency key is minted when the page
  // renders, so submitting the same form twice spends one credit.
  app.post('/credits/spend', async (c) => {
    const sessionId = await sessionOf(c)
    if (!sessionId) return c.redirect('/')
    const form = await c.req.parseBody()
    const key = typeof form.key === 'string' && form.key ? form.key : crypto.randomUUID()
    try {
      const { balanceAfter } = await gatewayFor(config(c)).spend(sessionId, 1, key)
      return c.redirect(`/?spent=${balanceAfter}`)
    } catch (err) {
      if ((err as { code?: string }).code === 'INSUFFICIENT_CREDITS') return c.redirect('/?error=out-of-credits')
      throw err
    }
  })

  // The same, as a JSON API: what a metered endpoint looks like.
  app.get('/api/me', async (c) => {
    const account = await accountOf(c, await sessionOf(c))
    if (!account) return c.json({ message: 'Sign in first, at /auth/sign-in.' }, 401)
    return c.json({ runtime: getRuntimeKey(), ...account })
  })

  app.post('/api/spend', async (c) => {
    const sessionId = await sessionOf(c)
    if (!sessionId) return c.json({ message: 'Sign in first, at /auth/sign-in.' }, 401)
    try {
      const key = c.req.header('Idempotency-Key') || crypto.randomUUID()
      return c.json(await gatewayFor(config(c)).spend(sessionId, 1, key))
    } catch (err) {
      if ((err as { code?: string }).code === 'INSUFFICIENT_CREDITS') {
        return c.json({ message: 'Out of credits.' }, 402)
      }
      throw err
    }
  })

  return app
}

const Page: FC<PropsWithChildren> = ({ children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Hono with BuildBase</title>
      <style>{`
        :root { color-scheme: light dark; --fg: #111827; --muted: #6b7280; --line: #e5e7eb; --bg: #fff; --accent: #ff5a1f; }
        @media (prefers-color-scheme: dark) { :root { --fg: #f3f4f6; --muted: #9ca3af; --line: #374151; --bg: #111827; } }
        body { font: 16px/1.5 system-ui, sans-serif; color: var(--fg); background: var(--bg); margin: 0; }
        main { max-width: 560px; margin: 64px auto; padding: 0 16px; }
        h1 { font-size: 28px; margin: 0 0 4px; }
        .muted { color: var(--muted); }
        .card { border: 1px solid var(--line); border-radius: 12px; padding: 20px; margin: 24px 0; }
        dl { display: grid; grid-template-columns: 110px 1fr; gap: 8px 12px; margin: 0; }
        dt { color: var(--muted); }
        dd { margin: 0; overflow-wrap: anywhere; }
        .card > p:first-child { margin-top: 0; }
        .credits { font-size: 32px; font-weight: 700; margin: 0 0 16px; }
        .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        form { margin: 0; }
        button, .button { font: inherit; line-height: 1.5; border: 1px solid transparent; border-radius: 8px; padding: 9px 16px; cursor: pointer; text-decoration: none; display: inline-block; }
        .primary { background: var(--accent); color: #fff; }
        .quiet { background: transparent; color: var(--muted); border-color: var(--line); }
        .notice { padding: 10px 14px; border-radius: 8px; background: #ecfdf5; color: #065f46; }
        .error { background: #fef2f2; color: #991b1b; }
        code { font-size: 14px; }
      `}</style>
    </head>
    <body>
      <main>{children}</main>
    </body>
  </html>
)

const Header: FC = () => (
  <>
    <h1>Hono with BuildBase</h1>
    <p class="muted">
      Running on <strong id="runtime">{RUNTIMES[getRuntimeKey()] ?? getRuntimeKey()}</strong>. The same app runs on
      Node.js, Bun, Deno and Cloudflare Workers.
    </p>
  </>
)

const Setup: FC<{ missing: string[] }> = ({ missing }) => (
  <>
    <Header />
    <div class="card">
      <p>
        <strong>Almost there.</strong> Set {missing.map((m) => <code>{m} </code>)}and restart. The README has the
        console steps.
      </p>
    </div>
  </>
)

const errors: Record<string, string> = {
  'out-of-credits': 'Out of credits. Grant some in the BuildBase console, or sell them with a credit package.',
  'sign-in-not-verified': 'Sign-in could not be verified. Try again.',
}

const SignedOut: FC<{ error?: string }> = ({ error }) => (
  <>
    <Header />
    {error ? <p class="notice error">{errors[error] ?? `Sign-in failed: ${error}`}</p> : null}
    <div class="card">
      <p>Sign in on BuildBase's hosted page. It comes back here with a code, which the server swaps for a session.</p>
      <a class="button primary" href="/auth/sign-in">
        Sign in with BuildBase
      </a>
    </div>
  </>
)

const SignedIn: FC<{ account: Account; spent?: string; error?: string }> = ({ account, spent, error }) => (
  <>
    <Header />
    {spent ? <p class="notice">Spent 1 credit. {spent} left.</p> : null}
    {error ? <p class="notice error">{errors[error] ?? error}</p> : null}
    <div class="card">
      <dl>
        <dt>Name</dt>
        <dd id="name">{account.profile.name ?? '-'}</dd>
        <dt>Email</dt>
        <dd id="email">{account.profile.email}</dd>
        <dt>Workspace</dt>
        <dd>{account.workspace?.name ?? 'None yet'}</dd>
      </dl>
    </div>
    <div class="card">
      <p class="muted">Credits in this workspace</p>
      <p class="credits" id="credits">
        {account.credits ?? '-'}
      </p>
      <div class="row">
        <form method="post" action="/credits/spend">
          <input type="hidden" name="key" value={crypto.randomUUID()} />
          <button class="primary" type="submit">
            Spend 1 credit
          </button>
        </form>
        <a class="button quiet" href="/api/me">
          GET /api/me
        </a>
        <form method="post" action="/auth/sign-out">
          <button class="quiet" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </div>
  </>
)
