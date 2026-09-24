import {
  FastifyPluginAsyncTypebox,
  Type
} from '@fastify/type-provider-typebox'

/**
 * Changed for the BuildBase example: `PUT /update-password` is gone, because
 * BuildBase owns the password. In its place, `GET /me` shows this app's user
 * next to what the server SDK reads from BuildBase for the same person.
 */
const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    '/me',
    {
      schema: {
        response: {
          200: Type.Object({
            user: Type.Object({
              id: Type.Number(),
              email: Type.String(),
              username: Type.String(),
              roles: Type.Array(Type.String())
            }),
            buildbase: Type.Object({
              profile: Type.Object({
                id: Type.String(),
                email: Type.String(),
                name: Type.Optional(Type.String())
              }),
              workspace: Type.Union([
                Type.Object({ id: Type.String(), name: Type.String() }),
                Type.Null()
              ]),
              credits: Type.Union([Type.Number(), Type.Null()])
            })
          })
        },
        tags: ['Users']
      }
    },
    async function (request, reply) {
      const sessionId = request.session.buildbaseSessionId
      if (!sessionId) {
        return reply.unauthorized('No BuildBase session. Sign in again.')
      }

      return {
        user: request.session.user,
        buildbase: await fastify.buildbase.account(sessionId)
      }
    }
  )
}

export default plugin
