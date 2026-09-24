import fastifySession from '@fastify/session'
import fp from 'fastify-plugin'
import { Auth } from '../../schemas/auth.js'
import fastifyCookie from '@fastify/cookie'

declare module 'fastify' {
  interface Session {
    user: Auth
    // Added for the BuildBase example: the sign-in round trip's CSRF check,
    // and the BuildBase session the server SDK acts as for this user.
    buildbaseState?: string
    buildbaseSessionId?: string
  }
}

/**
 * This plugins enables the use of session.
 *
 * @see {@link https://github.com/fastify/session}
 */
export default fp(async (fastify) => {
  fastify.register(fastifyCookie)
  fastify.register(fastifySession, {
    secret: fastify.config.COOKIE_SECRET,
    cookieName: fastify.config.COOKIE_NAME,
    cookie: {
      secure: fastify.config.COOKIE_SECURED,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1800000
    }
  })
}, {
  name: 'session'
})
