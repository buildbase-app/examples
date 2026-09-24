// Added for the BuildBase example: the hosted page returns here with a
// one-time code. Check the state, exchange the code on the server, read the
// BuildBase user, and open this app's session for them.
import { redirect } from 'react-router'
import {
	createSessionForBuildBaseUser,
	signInRedirectKey,
	signInStateKey,
} from '#app/utils/auth.server.ts'
import { buildbaseFor, exchangeCode } from '#app/utils/buildbase.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/auth.buildbase.callback.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url)
	const code = url.searchParams.get('code')
	const state = url.searchParams.get('state')
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	if (!code || !state || state !== authSession.get(signInStateKey)) {
		return redirectWithToast('/login', {
			type: 'error',
			title: 'Sign-in did not complete',
			description: 'Please try again.',
		})
	}

	const buildbaseSessionId = await exchangeCode(code)
	const profile = await buildbaseFor(buildbaseSessionId).users.getProfile()
	// The profile API returns `id`; older SDK types call it `_id`.
	const { id, _id, email, name } = profile as typeof profile & { id?: string }
	if (!email) throw redirect('/login')

	return createSessionForBuildBaseUser({
		request,
		buildbaseSessionId,
		profile: { id: String(id ?? _id), email, name },
		redirectTo: authSession.get(signInRedirectKey) || '/',
	})
}
