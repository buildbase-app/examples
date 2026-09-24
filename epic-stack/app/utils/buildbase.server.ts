// Added for the BuildBase example: sign-in through BuildBase's hosted pages,
// and the server SDK. Replaces epic-stack's passwords, verification emails,
// onboarding, GitHub OAuth, passkeys and two-factor code.
import crypto from 'node:crypto'
import { ApiVersion, AuthApi, BuildBase } from '@buildbase/sdk'

const serverUrl = () =>
	process.env.BUILDBASE_SERVER_URL ?? 'https://api.console.buildbase.app'

export const isBuildBaseConfigured = () =>
	Boolean(
		process.env.BUILDBASE_ORG_ID &&
		process.env.BUILDBASE_CLIENT_ID &&
		process.env.BUILDBASE_CLIENT_SECRET,
	)

/** Where the hosted page sends people back to. Register it on the auth client. */
export const callbackUrl = (request: Request) =>
	new URL('/auth/buildbase/callback', request.url).toString()

export const newState = () => crypto.randomBytes(16).toString('hex')

/** Step 1: the hosted sign-in URL for this visitor. */
export async function getSignInUrl(request: Request, state: string) {
	const { redirectUrl } = await new AuthApi({
		serverUrl: serverUrl(),
		version: ApiVersion.V1,
	}).requestAuth({
		orgId: process.env.BUILDBASE_ORG_ID!,
		clientId: process.env.BUILDBASE_CLIENT_ID!,
		redirect: { success: callbackUrl(request), error: callbackUrl(request) },
		state,
	})
	return redirectUrl
}

/** Step 2: exchange the one-time code, on the server, for a session ID. */
export async function exchangeCode(code: string) {
	const res = await fetch(`${serverUrl()}/api/v1/auth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			code,
			orgId: process.env.BUILDBASE_ORG_ID,
			clientId: process.env.BUILDBASE_CLIENT_ID,
			clientSecret: process.env.BUILDBASE_CLIENT_SECRET,
		}),
	})
	if (!res.ok)
		throw new Error(`BuildBase token exchange failed (${res.status})`)
	const { data } = (await res.json()) as { data: { sessionId: string } }
	return data.sessionId
}

let client: ReturnType<typeof BuildBase> | undefined

/**
 * The server SDK, bound to one session. React Router loaders have no async
 * request context, so each one binds its session with withSession().
 */
export function buildbaseFor(sessionId: string) {
	client ??= BuildBase({
		serverUrl: serverUrl(),
		orgId: process.env.BUILDBASE_ORG_ID!,
	})
	return client.withSession(sessionId)
}

/** Ends the BuildBase session itself, not only this app's cookie. */
export async function revokeBuildBaseSession(sessionId: string | undefined) {
	if (!sessionId) return
	await new AuthApi({ serverUrl: serverUrl(), version: ApiVersion.V1 })
		.logout(sessionId)
		.catch(() => {})
}
