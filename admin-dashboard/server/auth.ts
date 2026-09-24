// Added for the BuildBase example: the three auth endpoints a browser app
// needs, as plain Request -> Response handlers. They run as Vercel Functions
// (api/auth/*) and inside the Vite dev server (see vite.config.ts), so the
// client secret never reaches the browser in either.

const SESSION_COOKIE = 'bb-session'

const env = (name: string) => process.env[name] ?? ''

function serverUrl() {
  return (
    env('VITE_BUILDBASE_SERVER_URL') || 'https://api.console.buildbase.app'
  )
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

function sessionCookie(value: string, maxAge: number) {
  const secure = env('NODE_ENV') === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

/**
 * POST /api/auth/verify: the hosted sign-in page redirects back with a
 * one-time code, which is exchanged here for a session.
 */
export async function verify(request: Request): Promise<Response> {
  const { code } = (await request.json().catch(() => ({}))) as {
    code?: string
  }
  if (!code) return json({ error: 'Missing code' }, { status: 400 })

  const res = await fetch(`${serverUrl()}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      orgId: env('VITE_BUILDBASE_ORG_ID'),
      clientId: env('VITE_BUILDBASE_CLIENT_ID'),
      clientSecret: env('BUILDBASE_CLIENT_SECRET'),
    }),
  })
  if (!res.ok) return json({ error: 'Sign-in failed' }, { status: 401 })

  const { data } = (await res.json()) as { data: { sessionId: string } }
  return json(
    { sessionId: data.sessionId },
    { headers: { 'Set-Cookie': sessionCookie(data.sessionId, 60 * 60 * 24 * 30) } }
  )
}

/** GET /api/auth/session: lets the app restore the session after a reload. */
export function session(request: Request): Response {
  return json({ sessionId: readCookie(request, SESSION_COOKIE) })
}

/** POST /api/auth/signout */
export function signout(): Response {
  return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } })
}
