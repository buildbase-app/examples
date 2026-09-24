import { FastifyInstance } from 'fastify'

export default async function (fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    // Changed for the BuildBase example: the sign-in round trip is public.
    if (request.url.startsWith('/api/auth/buildbase/')) {
      return
    }

    if (!request.session.user) {
      reply.unauthorized('You must be authenticated to access this route.')
    }
  })
}
