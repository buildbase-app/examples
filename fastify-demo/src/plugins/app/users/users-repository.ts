// Changed for the BuildBase example: the password lookup and update are gone,
// and upsertFromBuildBase() finds or creates the user behind a BuildBase sign-in.
import { FastifyInstance } from 'fastify'
import { Knex } from 'knex'
import fp from 'fastify-plugin'
import { Auth } from '../../../schemas/auth.js'
import { BuildBaseProfile } from '../buildbase.js'

declare module 'fastify' {
  interface FastifyInstance {
    usersRepository: ReturnType<typeof createUsersRepository>;
  }
}

type User = Omit<Auth, 'roles'>

/** The role every new BuildBase user starts with. */
const DEFAULT_ROLE = 'basic'

export function createUsersRepository (fastify: FastifyInstance) {
  const knex = fastify.knex

  return {
    async findByEmail (email: string, trx?: Knex) {
      const user: User = await (trx ?? knex)('users')
        .select('id', 'username', 'email')
        .where({ email })
        .first()

      return user
    },

    /**
     * Added for the BuildBase example. Finds this app's user for a BuildBase
     * identity: by BuildBase ID first, then by email, so a user who existed
     * before BuildBase is adopted rather than duplicated. Anyone else gets a
     * new user with the default role.
     */
    async upsertFromBuildBase (profile: BuildBaseProfile, trx: Knex) {
      const linked: User = await trx('users')
        .select('id', 'username', 'email')
        .where({ buildbase_id: profile.id })
        .first()
      if (linked) return linked

      const existing = await this.findByEmail(profile.email, trx)
      if (existing) {
        await trx('users').update({ buildbase_id: profile.id }).where({ id: existing.id })
        return existing
      }

      const username = profile.name || profile.email.split('@')[0]
      const [id] = await trx('users').insert({ email: profile.email, username, buildbase_id: profile.id })
      const role = await trx('roles').select('id').where({ name: DEFAULT_ROLE }).first()
      if (role) {
        await trx('user_roles').insert({ user_id: id, role_id: role.id })
      }

      return { id, username, email: profile.email }
    },

    async findUserRolesByEmail (email: string, trx: Knex) {
      const roles: ({ name: string })[] = await trx('roles')
        .select('roles.name')
        .join('user_roles', 'roles.id', '=', 'user_roles.role_id')
        .join('users', 'user_roles.user_id', '=', 'users.id')
        .where('users.email', email)

      return roles
    }
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
    const repo = createUsersRepository(fastify)
    fastify.decorate('usersRepository', repo)
  },
  {
    name: 'users-repository',
    dependencies: ['knex']
  }
)
