import { beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.tsx'
import type { BuildBaseGateway } from '../src/buildbase.ts'

// A stand-in for BuildBase. The one-time code it hands out is the email to
// sign in as, and every workspace starts with 3 credits.
function fakeBuildBase() {
  const credits = new Map<string, number>()
  const spent = new Set<string>()
  const revoked: string[] = []
  const emailOf = (sessionId: string) => sessionId.replace(/^session:/, '')
  const balance = (email: string) => credits.get(email) ?? 3
  const gateway: BuildBaseGateway = {
    async signInUrl(state, callbackUrl) {
      return `https://auth.buildbase.test/sign-in?state=${state}&to=${encodeURIComponent(callbackUrl)}`
    },
    async exchangeCode(code) {
      return `session:${code}`
    },
    async account(sessionId) {
      if (revoked.includes(sessionId)) throw Object.assign(new Error('Unauthorized'), { status: 401 })
      const email = emailOf(sessionId)
      return {
        profile: { id: `bb_${email}`, email, name: email.split('@')[0] },
        workspace: { id: `ws_${email}`, name: 'Workspace' },
        credits: balance(email),
      }
    },
    async spend(sessionId, amount, key) {
      const email = emailOf(sessionId)
      if (spent.has(key)) return { balanceAfter: balance(email) }
      if (balance(email) < amount) throw Object.assign(new Error('Insufficient credits'), { code: 'INSUFFICIENT_CREDITS' })
      spent.add(key)
      credits.set(email, balance(email) - amount)
      return { balanceAfter: balance(email) }
    },
    async revoke(sessionId) {
      revoked.push(sessionId)
    },
  }
  return { gateway, credits, revoked }
}

const BASE = 'http://localhost:3000'

/** A browser, as far as cookies go. */
function client(app: ReturnType<typeof createApp>) {
  const jar = new Map<string, string>()
  return {
    jar,
    async request(path: string, init: RequestInit = {}) {
      const headers = new Headers(init.headers)
      if (jar.size) headers.set('Cookie', [...jar].map(([k, v]) => `${k}=${v}`).join('; '))
      const res = await app.request(`${BASE}${path}`, { ...init, headers })
      for (const line of res.headers.getSetCookie()) {
        const [pair] = line.split(';')
        const [name, ...rest] = pair.split('=')
        const value = rest.join('=')
        if (!value || /Max-Age=0/i.test(line)) jar.delete(name)
        else jar.set(name, value)
      }
      return res
    },
    /** Posts a form the way a same-origin page would. */
    post(path: string, fields: Record<string, string> = {}) {
      return this.request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: BASE },
        body: new URLSearchParams(fields),
      })
    },
  }
}

async function signIn(browser: ReturnType<typeof client>, email: string) {
  const start = await browser.request('/auth/sign-in')
  const state = new URL(start.headers.get('location')!).searchParams.get('state')!
  return browser.request(`/auth/callback?code=${encodeURIComponent(email)}&state=${state}`)
}

describe('Hono with BuildBase', () => {
  beforeEach(() => {
    process.env.BUILDBASE_ORG_ID = 'org_test'
    process.env.BUILDBASE_CLIENT_ID = 'client_test'
    process.env.BUILDBASE_CLIENT_SECRET = 'secret_test'
    process.env.COOKIE_SECRET = 'a-test-cookie-secret-that-is-long-enough'
    delete process.env.APP_URL
  })

  it('shows what to set when BuildBase is not configured', async () => {
    delete process.env.BUILDBASE_ORG_ID
    const app = createApp(() => fakeBuildBase().gateway)

    const home = await (await app.request(`${BASE}/`)).text()
    assert.match(home, /Almost there/)
    assert.match(home, /BUILDBASE_ORG_ID/)

    const signIn = await app.request(`${BASE}/auth/sign-in`)
    assert.equal(signIn.status, 503)
  })

  it('signs in through BuildBase and shows the account', async () => {
    const app = createApp(() => fakeBuildBase().gateway)
    const browser = client(app)

    const start = await browser.request('/auth/sign-in')
    assert.equal(start.status, 302)
    const location = new URL(start.headers.get('location')!)
    assert.equal(location.origin, 'https://auth.buildbase.test')
    assert.equal(location.searchParams.get('to'), `${BASE}/auth/callback`)
    assert.ok(browser.jar.has('bb_state'))

    const done = await browser.request(`/auth/callback?code=ada@example.com&state=${location.searchParams.get('state')}`)
    assert.equal(done.headers.get('location'), '/')
    assert.ok(browser.jar.has('bb_session'))
    assert.ok(!browser.jar.has('bb_state'))

    const home = await (await browser.request('/')).text()
    assert.match(home, /ada@example.com/)
    assert.match(home, /id="credits">3</)
  })

  it('builds the callback URL from APP_URL when it is set', async () => {
    process.env.APP_URL = 'https://app.example.com'
    const app = createApp(() => fakeBuildBase().gateway)

    const res = await app.request(`${BASE}/auth/sign-in`)
    assert.equal(new URL(res.headers.get('location')!).searchParams.get('to'), 'https://app.example.com/auth/callback')
  })

  it('refuses a callback whose state does not match', async () => {
    const app = createApp(() => fakeBuildBase().gateway)
    const browser = client(app)
    await browser.request('/auth/sign-in')

    const res = await browser.request('/auth/callback?code=ada@example.com&state=forged')
    assert.equal(res.headers.get('location'), '/?error=sign-in-not-verified')
    assert.ok(!browser.jar.has('bb_session'))
  })

  it('ignores a session cookie that was not signed by this app', async () => {
    const app = createApp(() => fakeBuildBase().gateway)
    const browser = client(app)
    browser.jar.set('bb_session', 'session%3Aeve%40example.com.forged')

    const res = await browser.request('/api/me')
    assert.equal(res.status, 401)
  })

  it('spends a credit per form, once per idempotency key', async () => {
    const fake = fakeBuildBase()
    const app = createApp(() => fake.gateway)
    const browser = client(app)
    await signIn(browser, 'ada@example.com')

    const first = await browser.post('/credits/spend', { key: 'k1' })
    assert.equal(first.headers.get('location'), '/?spent=2')
    const again = await browser.post('/credits/spend', { key: 'k1' })
    assert.equal(again.headers.get('location'), '/?spent=2')
    assert.equal(fake.credits.get('ada@example.com'), 2)
  })

  it('answers 402 from the API when the workspace is out of credits', async () => {
    const fake = fakeBuildBase()
    fake.credits.set('ada@example.com', 0)
    const app = createApp(() => fake.gateway)
    const browser = client(app)
    await signIn(browser, 'ada@example.com')

    const res = await browser.request('/api/spend', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    assert.equal(res.status, 402)

    // A body-less POST could be a cross-site form, so the CSRF guard refuses it.
    const bare = await browser.request('/api/spend', { method: 'POST' })
    assert.equal(bare.status, 403)

    const form = await browser.post('/credits/spend', { key: 'k2' })
    assert.equal(form.headers.get('location'), '/?error=out-of-credits')
  })

  it('rejects a form posted from another site', async () => {
    const app = createApp(() => fakeBuildBase().gateway)
    const browser = client(app)
    await signIn(browser, 'ada@example.com')

    const res = await browser.request('/credits/spend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://evil.example' },
      body: 'key=k3',
    })
    assert.equal(res.status, 403)
  })

  it('signs out of BuildBase too', async () => {
    const fake = fakeBuildBase()
    const app = createApp(() => fake.gateway)
    const browser = client(app)
    await signIn(browser, 'ada@example.com')

    await browser.post('/auth/sign-out')
    assert.deepEqual(fake.revoked, ['session:ada@example.com'])
    assert.ok(!browser.jar.has('bb_session'))
    assert.equal((await browser.request('/api/me')).status, 401)
  })

  it('treats a session BuildBase revoked elsewhere as signed out', async () => {
    const fake = fakeBuildBase()
    const app = createApp(() => fake.gateway)
    const browser = client(app)
    await signIn(browser, 'ada@example.com')
    fake.revoked.push('session:ada@example.com')

    const home = await (await browser.request('/')).text()
    assert.match(home, /Sign in with BuildBase/)
    assert.ok(!browser.jar.has('bb_session'))
  })
})
