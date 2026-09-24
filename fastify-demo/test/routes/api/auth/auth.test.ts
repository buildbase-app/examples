import { describe, it } from 'node:test'
import assert from 'node:assert'
import { build, fakeBuildBase } from '../../../helper.js'

// Changed for the BuildBase example: the email and password login is replaced
// by the BuildBase round trip, so these tests drive that instead.
type Fake = ReturnType<typeof fakeBuildBase>

async function startSignIn (app: Awaited<ReturnType<typeof build>>) {
  const res = await app.inject({ url: '/api/auth/buildbase/sign-in' })
  const cookie = res.cookies.find((c) => c.name === app.config.COOKIE_NAME)
  const state = new URL(String(res.headers.location)).searchParams.get('state')
  return { res, cookie: cookie!.value, state: state! }
}

describe('Auth api', () => {
  describe('GET /api/auth/buildbase/sign-in', () => {
    it('should redirect to BuildBase with a state bound to the session', async (t) => {
      const app = await build(t)

      const { res, cookie, state } = await startSignIn(app)

      assert.strictEqual(res.statusCode, 302)
      assert.ok(String(res.headers.location).startsWith('https://auth.buildbase.test/sign-in'))
      assert.match(state, /^[0-9a-f]{32}$/)
      assert.ok(cookie)
    })

    it('should say what is missing when BuildBase is not configured', async (t) => {
      const app = await build(t)
      t.mock.method(app.buildbase, 'signInUrl', async () => {
        throw Object.assign(new Error('BuildBase is not configured.'), { code: 'BUILDBASE_NOT_CONFIGURED' })
      })

      const res = await app.inject({ url: '/api/auth/buildbase/sign-in' })

      assert.strictEqual(res.statusCode, 503)
      assert.deepStrictEqual(JSON.parse(res.payload), { message: 'BuildBase is not configured.' })
    })
  })

  describe('GET /api/auth/buildbase/callback', () => {
    it('should open a session for a seeded user, with their roles', async (t) => {
      const app = await build(t)
      const { cookie, state } = await startSignIn(app)

      const res = await app.inject({
        url: '/api/auth/buildbase/callback',
        query: { code: 'moderator@example.com', state },
        cookies: { [app.config.COOKIE_NAME]: cookie }
      })

      assert.strictEqual(res.statusCode, 302)
      assert.strictEqual(res.headers.location, '/api')

      const me = await app.inject({ url: '/api/users/me', cookies: { [app.config.COOKIE_NAME]: cookie } })
      const body = JSON.parse(me.payload)
      assert.strictEqual(body.user.email, 'moderator@example.com')
      assert.deepStrictEqual(body.user.roles.sort(), ['basic', 'moderator'])
      assert.strictEqual(body.buildbase.profile.id, 'bb_moderator@example.com')

      const row = await app.knex('users').select('buildbase_id').where({ email: 'moderator@example.com' }).first()
      assert.strictEqual(row.buildbase_id, 'bb_moderator@example.com')
    })

    it('should create a new user with the basic role on first sign-in', async (t) => {
      const app = await build(t)
      const email = `new-${Date.now()}@example.com`

      const cookie = await app.login(email)
      const me = await app.inject({ url: '/api/users/me', cookies: { [app.config.COOKIE_NAME]: cookie } })

      assert.strictEqual(me.statusCode, 200)
      assert.deepStrictEqual(JSON.parse(me.payload).user.roles, ['basic'])

      await app.knex('users').delete().where({ email })
    })

    it('should refuse a callback whose state does not match', async (t) => {
      const app = await build(t)
      const { cookie } = await startSignIn(app)

      const res = await app.inject({
        url: '/api/auth/buildbase/callback',
        query: { code: 'basic@example.com', state: 'forged' },
        cookies: { [app.config.COOKIE_NAME]: cookie }
      })

      assert.strictEqual(res.statusCode, 401)
    })

    it('should refuse a callback with no sign-in in progress', async (t) => {
      const app = await build(t)

      const res = await app.inject({
        url: '/api/auth/buildbase/callback',
        query: { code: 'basic@example.com', state: 'anything' }
      })

      assert.strictEqual(res.statusCode, 401)
    })

    it('should report an error BuildBase sends back', async (t) => {
      const app = await build(t)
      const { cookie, state } = await startSignIn(app)

      const res = await app.inject({
        url: '/api/auth/buildbase/callback',
        query: { error: 'access_denied', state },
        cookies: { [app.config.COOKIE_NAME]: cookie }
      })

      assert.strictEqual(res.statusCode, 401)
      assert.match(JSON.parse(res.payload).message, /access_denied/)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should revoke the BuildBase session and end this one', async (t) => {
      const app = await build(t)
      const cookie = await app.login('basic@example.com')

      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        cookies: { [app.config.COOKIE_NAME]: cookie }
      })

      assert.strictEqual(res.statusCode, 200)
      assert.deepStrictEqual((app.buildbase as Fake).revoked, ['session:basic@example.com'])

      const after = await app.inject({ url: '/api', cookies: { [app.config.COOKIE_NAME]: cookie } })
      assert.strictEqual(after.statusCode, 401)
    })
  })
})
