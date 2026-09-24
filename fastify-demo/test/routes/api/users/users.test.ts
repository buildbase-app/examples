import { describe, it } from 'node:test'
import assert from 'node:assert'
import { build } from '../../../helper.js'

// Changed for the BuildBase example: the password update tests went with
// the password. GET /me reads the user's BuildBase account instead.
describe('Users API', () => {
  it('should return the user and their BuildBase account', async (t) => {
    const app = await build(t)

    const res = await app.injectWithLogin('basic@example.com', {
      url: '/api/users/me'
    })

    assert.strictEqual(res.statusCode, 200)
    const body = JSON.parse(res.payload)
    assert.strictEqual(body.user.username, 'basic')
    assert.deepStrictEqual(body.buildbase, {
      profile: { id: 'bb_basic@example.com', email: 'basic@example.com', name: 'basic' },
      workspace: { id: 'ws_basic@example.com', name: 'Workspace' },
      credits: 100
    })
  })

  it('should require a session', async (t) => {
    const app = await build(t)

    const res = await app.inject({ url: '/api/users/me' })

    assert.strictEqual(res.statusCode, 401)
  })
})
