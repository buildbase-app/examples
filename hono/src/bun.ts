// Bun: `npm run dev:bun`. Bun runs the TypeScript and JSX directly.
import { createApp } from './app.tsx'

const port = Number(process.env.PORT ?? 3000)
console.log(`Listening on http://localhost:${port} (Bun)`)

export default { port, fetch: createApp().fetch }
