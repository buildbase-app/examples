/// <reference types="vitest/config" />
// Modified from satnaing/shadcn-admin: serves the BuildBase auth endpoints in
// development, the same handlers Vercel runs from api/auth in production.
import path from 'path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { playwright } from '@vitest/browser-playwright'

const authRoutes = {
  'POST /api/auth/verify': 'verify',
  'GET /api/auth/session': 'session',
  'POST /api/auth/signout': 'signout',
} as const

/** Runs server/auth.ts inside the dev server, so `pnpm dev` needs nothing else. */
function buildbaseAuth(): Plugin {
  return {
    name: 'buildbase-auth',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const key = `${req.method} ${req.url?.split('?')[0]}`
        const name = authRoutes[key as keyof typeof authRoutes]
        if (!name) return next()
        const handlers = (await server.ssrLoadModule(
          '/server/auth.ts'
        )) as typeof import('./server/auth')
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const request = new Request(`http://localhost${req.url}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
        })
        const response = await handlers[name](request)
        res.statusCode = response.status
        response.headers.forEach((value, header) =>
          res.setHeader(header, value)
        )
        res.end(await response.text())
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The dev server's auth endpoints read the secret the way a Vercel Function
  // does, from process.env; only VITE_* variables reach the browser.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      buildbaseAuth(),
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      silent: 'passed-only',
      unstubEnvs: true,
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
      coverage: {
        // include: ['src/**/*.{js,jsx,ts,tsx}'], // Uncomment to expand the report to all src/**/* so untested modules appear as 0% coverage.
        exclude: [
          'src/components/ui/**',
          'src/assets/**',
          'src/tanstack-table.d.ts',
          'src/routeTree.gen.ts',
          'src/test-utils/**',
          'src/routes/**',
        ],
      },
    },
  }
})
