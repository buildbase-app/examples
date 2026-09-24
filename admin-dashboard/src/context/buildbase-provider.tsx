// Added for the BuildBase example: sign-in, workspaces and the account
// screens, for the whole dashboard.
import { useEffect, useRef } from 'react'
import { ApiVersion } from '@buildbase/sdk'
import '@buildbase/sdk/css'
import {
  SaaSOSProvider,
  useSaaSAuth,
  useSaaSWorkspaces,
} from '@buildbase/sdk/react'
import {
  buildbaseConfig,
  getSession,
  isConfigured,
  setSession,
} from '@/lib/buildbase'

/** Shown until the BuildBase env vars are set, instead of a broken sign-in. */
function SetupNotice() {
  return (
    <main className='mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-3 p-8'>
      <h1 className='text-2xl font-semibold tracking-tight'>
        Connect BuildBase
      </h1>
      <p className='text-sm text-muted-foreground'>
        Set <code>VITE_BUILDBASE_ORG_ID</code>,{' '}
        <code>VITE_BUILDBASE_CLIENT_ID</code>,{' '}
        <code>VITE_BUILDBASE_REDIRECT_URL</code> and{' '}
        <code>BUILDBASE_CLIENT_SECRET</code>, then restart. The README walks
        through each one.
      </p>
    </main>
  )
}

/**
 * Loads the signed-in user's workspaces and selects the first. The SDK
 * fetches the list only when asked; the sidebar's team switcher reads it.
 */
function WorkspaceLoader() {
  const { isAuthenticated } = useSaaSAuth()
  const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace, workspaces } =
    useSaaSWorkspaces()

  // Once per sign-in: fetchWorkspaces changes identity whenever the list
  // updates, so depending on it alone would fetch in a loop.
  const fetched = useRef(false)
  useEffect(() => {
    if (!isAuthenticated) {
      fetched.current = false
    } else if (!fetched.current) {
      fetched.current = true
      fetchWorkspaces()
    }
  }, [isAuthenticated, fetchWorkspaces])

  useEffect(() => {
    if (!currentWorkspace && workspaces?.length) {
      setCurrentWorkspace(workspaces[0])
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace])

  return null
}

export function BuildBaseProvider({ children }: { children: React.ReactNode }) {
  if (!isConfigured) return <SetupNotice />

  return (
    <SaaSOSProvider
      serverUrl={buildbaseConfig.serverUrl}
      version={ApiVersion.V1}
      orgId={buildbaseConfig.orgId}
      auth={{
        clientId: buildbaseConfig.clientId,
        redirectUrl: buildbaseConfig.redirectUrl,
        callbacks: {
          getSession,
          handleAuthentication: async (code: string) => {
            const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            })
            const { sessionId } = (await res.json()) as { sessionId: string }
            setSession(sessionId)
            return { sessionId }
          },
          onSignOut: async () => {
            await fetch('/api/auth/signout', { method: 'POST' })
            setSession(null)
          },
        },
      }}
    >
      <WorkspaceLoader />
      {children}
    </SaaSOSProvider>
  )
}
