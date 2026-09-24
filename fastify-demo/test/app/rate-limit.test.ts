import { it } from 'node:test'
import { build } from '../helper.js'
import assert from 'node:assert'

it('should be rate limited', async (t) => {
  const app = await build(t)

  // Changed for the BuildBase example: reads the limit rather than assuming 4,
  // since a BuildBase sign-in takes two requests and the suite runs with 8.
  for (let i = 0; i < app.config.RATE_LIMIT_MAX; i++) {
    const res = await app.inject({
      method: 'GET',
      url: '/'
    })

    assert.strictEqual(res.statusCode, 200)
  }

  const res = await app.inject({
    method: 'GET',
    url: '/'
  })

  assert.strictEqual(res.statusCode, 429)
})
