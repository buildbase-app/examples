// Added for the BuildBase example: the React SDK, for its prebuilt account
// screens. Sign-in itself happens on the server (routes/_auth/login.tsx), so
// the provider only restores the session the server already holds.
import '@buildbase/sdk/css'
import { ApiVersion, clearAuthIntent } from '@buildbase/sdk'
import {
	SaaSOSProvider,
	useSaaSAuth,
	useSaaSWorkspaces,
} from '@buildbase/sdk/react'
import { type ReactNode, useEffect, useRef } from 'react'

type BuildBaseEnv = {
	BUILDBASE_SERVER_URL: string
	BUILDBASE_ORG_ID?: string
	BUILDBASE_CLIENT_ID?: string
}

/**
 * The SDK's account screens open for a workspace, and the SDK fetches the
 * list only when asked: fetch it once per sign-in and select the first.
 */
function WorkspaceLoader() {
	const { isAuthenticated } = useSaaSAuth()
	const { currentWorkspace, fetchWorkspaces, setCurrentWorkspace, workspaces } =
		useSaaSWorkspaces()
	const fetched = useRef(false)

	useEffect(() => {
		if (!isAuthenticated) {
			fetched.current = false
		} else if (!fetched.current) {
			fetched.current = true
			void fetchWorkspaces()
		}
	}, [isAuthenticated, fetchWorkspaces])

	useEffect(() => {
		if (!currentWorkspace && workspaces?.[0]) {
			void setCurrentWorkspace(workspaces[0])
		}
	}, [currentWorkspace, workspaces, setCurrentWorkspace])

	return null
}

export function BuildBaseProvider({
	env,
	children,
}: {
	env: BuildBaseEnv
	children: ReactNode
}) {
	if (!env.BUILDBASE_ORG_ID || !env.BUILDBASE_CLIENT_ID) return <>{children}</>
	// The SDK remembers any page it saw signed out as "where to return after
	// sign-in", and jumps there the next time it finds a session. Sign-in here
	// is the server's job, which already returns people to the right page, so
	// drop that memory before the SDK starts.
	if (typeof window !== 'undefined') clearAuthIntent()
	return (
		<SaaSOSProvider
			serverUrl={env.BUILDBASE_SERVER_URL}
			version={ApiVersion.V1}
			orgId={env.BUILDBASE_ORG_ID}
			auth={{
				clientId: env.BUILDBASE_CLIENT_ID,
				redirectUrl: '/auth/buildbase/callback',
				callbacks: {
					getSession: async () => {
						const res = await fetch('/resources/buildbase-session')
						const { sessionId } = (await res.json()) as {
							sessionId: string | null
						}
						return sessionId
					},
					// Never reached: the server exchanges the code.
					handleAuthentication: async () => ({ sessionId: '' }),
					// Signing out is the /logout form, which ends both sessions.
					onSignOut: async () => {},
				},
			}}
		>
			<WorkspaceLoader />
			{children}
		</SaaSOSProvider>
	)
}
