// Deno: `npm run dev:deno`. Deno reads package.json and node_modules, so
// install with npm first.
import { createApp } from './app.tsx'

declare const Deno: { env: { get(key: string): string | undefined }; serve: (opts: { port: number }, handler: (req: Request) => Response | Promise<Response>) => unknown }

const port = Number(Deno.env.get('PORT') ?? 3000)
Deno.serve({ port }, createApp().fetch)
