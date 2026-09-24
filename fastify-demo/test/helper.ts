import Fastify, { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify'
import fp from 'fastify-plugin'
import { TestContext } from 'node:test'
import serviceApp from '../src/app.js'
import assert from 'node:assert'
import { BuildBaseGateway } from '../src/plugins/app/buildbase.js'

declare module 'fastify' {
  interface FastifyInstance {
    login: typeof login;
    injectWithLogin: typeof injectWithLogin;
  }
}

/**
 * Added for the BuildBase example: a stand-in for BuildBase, so the suite
 * runs without a BuildBase org. The one-time code it hands out is the email
 * to sign in as, and every workspace starts with 100 credits.
 */
export function fakeBuildBase () {
  const credits = new Map<string, number>()
  const spent = new Set<string>()
  const emailOf = (sessionId: string) => sessionId.replace(/^session:/, '')
  const balance = (email: string) => credits.get(email) ?? 100

  const fake: BuildBaseGateway & { credits: typeof credits, revoked: string[] } = {
    credits,
    revoked: [],
    async signInUrl (state) {
      return `https://auth.buildbase.test/sign-in?state=${state}`
    },
    async exchangeCode (code) {
      return `session:${code}`
    },
    async profile (sessionId) {
      const email = emailOf(sessionId)
      return { id: `bb_${email}`, email, name: email.split('@')[0] }
    },
    async account (sessionId) {
      const email = emailOf(sessionId)
      return {
        profile: await fake.profile(sessionId),
        workspace: { id: `ws_${email}`, name: 'Workspace' },
        credits: balance(email)
      }
    },
    async spend (sessionId, amount, description, idempotencyKey) {
      const email = emailOf(sessionId)
      if (spent.has(idempotencyKey)) return { balanceAfter: balance(email) }
      if (balance(email) < amount) {
        throw Object.assign(new Error('Insufficient credits'), { code: 'INSUFFICIENT_CREDITS' })
      }
      spent.add(idempotencyKey)
      credits.set(email, balance(email) - amount)
      return { balanceAfter: balance(email) }
    },
    async revoke (sessionId) {
      fake.revoked.push(sessionId)
    }
  }

  return fake
}

// Fill in this config with all the configurations
// needed for testing the application
export function config () {
  return {
    skipOverride: true, // Register our application with fastify-plugin
    buildbase: fakeBuildBase()
  }
}

export function expectValidationError (res: LightMyRequestResponse, expectedMessage: string) {
  assert.strictEqual(res.statusCode, 400)
  const { message } = JSON.parse(res.payload)
  assert.strictEqual(message, expectedMessage)
}

// Changed for the BuildBase example: signs in through the BuildBase round
// trip, with the fake above standing in for the hosted page.
async function login (this: FastifyInstance, email: string) {
  const start = await this.inject({ url: '/api/auth/buildbase/sign-in' })
  const state = new URL(String(start.headers.location)).searchParams.get('state')
  const startCookie = start.cookies.find((c) => c.name === this.config.COOKIE_NAME)

  if (!state || !startCookie) {
    throw new Error('Sign-in did not start.')
  }

  const res = await this.inject({
    url: '/api/auth/buildbase/callback',
    query: { code: email, state },
    cookies: { [this.config.COOKIE_NAME]: startCookie.value }
  })

  const cookie = res.cookies.find(
    (c) => c.name === this.config.COOKIE_NAME
  ) ?? startCookie

  if (res.statusCode !== 302) {
    throw new Error('Failed to retrieve session cookie.')
  }

  return cookie.value
}

async function injectWithLogin (
  this: FastifyInstance,
  email: string,
  opts: InjectOptions
) {
  const cookieValue = await this.login(email)

  opts.cookies = {
    ...opts.cookies,
    [this.config.COOKIE_NAME]: cookieValue
  }

  return this.inject({
    ...opts
  })
}

// automatically build and tear down our instance
export async function build (t?: TestContext) {
  const app = Fastify()

  app.register(fp(serviceApp), config())

  await app.ready()

  // This is after start, so we can't decorate the instance using `.decorate`
  app.login = login
  app.injectWithLogin = injectWithLogin

  // If we pass the test contest, it will close the app after we are done
  if (t) {
    t.after(() => app.close())
  }

  return app
}
