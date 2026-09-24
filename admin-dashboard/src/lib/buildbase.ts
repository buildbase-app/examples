// Added for the BuildBase example: client-side configuration. Only VITE_*
// variables reach the browser; the client secret stays in server/auth.ts.
export const buildbaseConfig = {
  serverUrl:
    import.meta.env.VITE_BUILDBASE_SERVER_URL ||
    'https://api.console.buildbase.app',
  orgId: import.meta.env.VITE_BUILDBASE_ORG_ID ?? '',
  clientId: import.meta.env.VITE_BUILDBASE_CLIENT_ID ?? '',
  redirectUrl: import.meta.env.VITE_BUILDBASE_REDIRECT_URL ?? '',
}

export const isConfigured = Boolean(
  buildbaseConfig.orgId && buildbaseConfig.clientId
)

let cachedSession: string | null | undefined

/** The session ID from our httpOnly cookie, asked once per page load. */
export async function getSession(): Promise<string | null> {
  if (cachedSession === undefined) {
    const res = await fetch('/api/auth/session')
    cachedSession = ((await res.json()) as { sessionId: string | null })
      .sessionId
  }
  return cachedSession
}

export function setSession(sessionId: string | null) {
  cachedSession = sessionId
}

const REDIRECT_KEY = 'bb-redirect'

/**
 * The hosted page always returns to the one registered redirect URL, so the
 * page someone was trying to open is kept across the round trip.
 */
export const pendingRedirect = {
  save(path: string | undefined) {
    if (path) sessionStorage.setItem(REDIRECT_KEY, path)
  },
  /** Read without clearing: StrictMode runs effects twice in development. */
  peek(): string {
    const path = sessionStorage.getItem(REDIRECT_KEY)
    return path?.startsWith('/') ? path : '/'
  },
  clear() {
    sessionStorage.removeItem(REDIRECT_KEY)
  },
}
