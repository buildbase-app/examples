// Modified from epicweb-dev/epic-stack: BuildBase proves who someone is, then
// this app creates its own Session row exactly as before, so getUserId(),
// requireUserId() and everything built on them are unchanged. Passwords,
// signup, verification, GitHub OAuth and passkeys are gone.
import { redirect } from 'react-router'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { revokeBuildBaseSession } from './buildbase.server.ts'
import { prisma } from './db.server.ts'
import { combineHeaders } from './misc.tsx'
import { authSessionStorage } from './session.server.ts'
import { USERNAME_MAX_LENGTH } from './user-validation.ts'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'
/** The BuildBase session, kept in the same httpOnly cookie as this app's. */
export const buildbaseSessionKey = 'buildbaseSessionId'
/** Kept across the trip to the hosted page: the anti-CSRF state and where to land. */
export const signInStateKey = 'buildbaseState'
export const signInRedirectKey = 'buildbaseRedirectTo'

export async function getUserId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	if (!sessionId) return null
	const session = await prisma.session.findUnique({
		select: { userId: true },
		where: { id: sessionId, expirationDate: { gt: new Date() } },
	})
	if (!session?.userId) {
		throw redirect('/', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		})
	}
	return session.userId
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const userId = await getUserId(request)
	if (!userId) {
		const requestUrl = new URL(request.url)
		redirectTo =
			redirectTo === null
				? null
				: (redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`)
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
		const loginRedirect = ['/login', loginParams?.toString()]
			.filter(Boolean)
			.join('?')
		throw redirect(loginRedirect)
	}
	return userId
}

export async function requireAnonymous(request: Request) {
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/')
	}
}

/** The signed-in user's BuildBase session ID, for the server SDK. */
export async function getBuildBaseSessionId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	return (authSession.get(buildbaseSessionKey) as string | undefined) ?? null
}

/** A free username from an email address, within epic-stack's rules. */
async function usernameFor(email: string) {
	const base = (email.split('@')[0] ?? 'user')
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, '_')
		.slice(0, USERNAME_MAX_LENGTH - 4)
		.padEnd(3, '_')
	for (let suffix = 0; ; suffix++) {
		const candidate = suffix === 0 ? base : `${base}_${suffix}`
		const taken = await prisma.user.findUnique({
			select: { id: true },
			where: { username: candidate },
		})
		if (!taken) return candidate
	}
}

/**
 * After the hosted page: find or create this app's user for the BuildBase
 * user, open one of this app's sessions for them, and remember the BuildBase
 * session next to it.
 */
export async function createSessionForBuildBaseUser({
	request,
	buildbaseSessionId,
	profile,
	redirectTo,
}: {
	request: Request
	buildbaseSessionId: string
	profile: { id: string; email: string; name?: string }
	redirectTo?: string | null
}) {
	const email = profile.email.toLowerCase()
	let user =
		(await prisma.user.findUnique({
			select: { id: true },
			where: { buildbaseId: profile.id },
		})) ??
		// A user from before BuildBase, with the same email, is adopted.
		(await prisma.user.findUnique({ select: { id: true }, where: { email } }))
	if (user) {
		await prisma.user.update({
			where: { id: user.id },
			data: { buildbaseId: profile.id, email },
		})
	} else {
		user = await prisma.user.create({
			select: { id: true },
			data: {
				buildbaseId: profile.id,
				email,
				username: await usernameFor(email),
				name: profile.name,
				roles: { connect: { name: 'user' } },
			},
		})
	}

	const session = await prisma.session.create({
		select: { id: true, expirationDate: true },
		data: { expirationDate: getSessionExpirationDate(), userId: user.id },
	})
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	authSession.set(sessionKey, session.id)
	authSession.set(buildbaseSessionKey, buildbaseSessionId)
	authSession.unset(signInStateKey)
	authSession.unset(signInRedirectKey)
	return redirect(safeRedirect(redirectTo), {
		headers: {
			'set-cookie': await authSessionStorage.commitSession(authSession, {
				expires: session.expirationDate,
			}),
		},
	})
}

export async function logout(
	{
		request,
		redirectTo = '/',
	}: {
		request: Request
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	// if this fails, we still need to delete the session from the user's browser
	// and it doesn't do any harm staying in the db anyway.
	if (sessionId) {
		// the .catch is important because that's what triggers the query.
		// learn more about PrismaPromise: https://www.prisma.io/docs/orm/reference/prisma-client-reference#prismapromise-behavior
		void prisma.session.deleteMany({ where: { id: sessionId } }).catch(() => {})
	}
	// Signing out here ends the BuildBase session too.
	await revokeBuildBaseSession(authSession.get(buildbaseSessionKey))
	throw redirect(safeRedirect(redirectTo), {
		...responseInit,
		headers: combineHeaders(
			{ 'set-cookie': await authSessionStorage.destroySession(authSession) },
			responseInit?.headers,
		),
	})
}
