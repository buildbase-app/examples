// Node.js: `npm run dev`, or `npm run build && npm start`.
import { serve } from '@hono/node-server'
import { createApp } from './app.tsx'

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: createApp().fetch, port }, () => console.log(`Listening on http://localhost:${port} (Node.js)`))
