import {
  FastifyPluginAsyncTypebox,
  Type
} from '@fastify/type-provider-typebox'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { BuildBaseCallbackQuerySchema } from '../../../schemas/auth.js'

/**
 * Changed for the BuildBase example: `POST /login` with an email and password
 * is gone. Signing in is a round trip through BuildBase's hosted page, which
 * handles passwords, magic links, social sign-in and verification:
 *
 *   GET /api/auth/buildbase/sign-in   -> redirect to BuildBase
 *   GET /api/auth/buildbase/callback  <- BuildBase returns with a code
 *
 * The callback leaves `request.session.user` exactly as the old login did, so
 * every other route and the role checks are unchanged.
 */
const sameState = (a?: string, b?: string) =>
  Boolean(a && b) && a!.length === b!.length && timingSafeEqual(Buffer.from(a!), Buffer.from(b!))

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { usersRepository, buildbase } = fastify

  fastify.get(
    '/buildbase/sign-in',
    {
      schema: {
        tags: ['Authentication'],
        description: 'Redirects to the BuildBase hosted sign-in page.'
      }
    },
    async function (request, reply) {
      const state = randomBytes(16).toString('hex')
      request.session.buildbaseState = state
      await request.session.save()

      try {
        return reply.redirect(await buildbase.signInUrl(state))
      } catch (err) {
        // Say what is missing: the error handler hides the message of a 5xx.
        if ((err as { code?: string }).code === 'BUILDBASE_NOT_CONFIGURED') {
          return reply.code(503).send({ message: (err as Error).message })
        }
        throw err
      }
    }
  )

  fastify.get(
    '/buildbase/callback',
    {
      schema: {
        querystring: BuildBaseCallbackQuerySchema,
        tags: ['Authentication'],
        description: 'Where BuildBase sends the visitor back. Opens the session and redirects to /api.'
      }
    },
    async function (request, reply) {
      const { code, state, error } = request.query
      const expected = request.session.buildbaseState
      request.session.buildbaseState = undefined

      if (error || !code || !sameState(state, expected)) {
        return reply.unauthorized(error ? `BuildBase sign-in failed: ${error}` : 'Sign-in could not be verified. Start again at /api/auth/buildbase/sign-in.')
      }

      const sessionId = await buildbase.exchangeCode(code)
      const profile = await buildbase.profile(sessionId)

      await fastify.knex.transaction(async (trx) => {
        const user = await usersRepository.upsertFromBuildBase(profile, trx)
        const roles = await usersRepository.findUserRolesByEmail(user.email, trx)

        request.session.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          roles: roles.map((role) => role.name)
        }
      })

      request.session.buildbaseSessionId = sessionId
      await request.session.save()

      return reply.redirect('/api')
    }
  )

  fastify.post(
    '/logout',
    {
      schema: {
        response: {
          200: Type.Object({
            success: Type.Boolean()
          })
        },
        tags: ['Authentication']
      }
    },
    async function (request) {
      const sessionId = request.session.buildbaseSessionId
      if (sessionId) {
        await buildbase.revoke(sessionId)
      }
      await request.session.destroy()

      return { success: true }
    }
  )
}

export default plugin
