// Cloudflare Workers: `npm run dev:workers`, then `npm run deploy:workers`.
// The env comes from wrangler.jsonc vars and secrets, per request.
import { createApp } from './app.tsx'

export default createApp()
