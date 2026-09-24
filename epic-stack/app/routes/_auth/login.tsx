// Modified from epicweb-dev/epic-stack: the username/password form, passkey
// button and GitHub button are replaced by BuildBase's hosted page, which
// offers sign-in and sign-up with whatever methods the org enables.
import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { data, Form, redirect, useSearchParams } from 'react-router'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	requireAnonymous,
	signInRedirectKey,
	signInStateKey,
} from '#app/utils/auth.server.ts'
import {
	getSignInUrl,
	isBuildBaseConfigured,
	newState,
} from '#app/utils/buildbase.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { type Route } from './+types/login.ts'

export const handle: SEOHandle = {
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireAnonymous(request)
	return { configured: isBuildBaseConfigured() }
}

export async function action({ request }: Route.ActionArgs) {
	await requireAnonymous(request)
	if (!isBuildBaseConfigured()) {
		return data({ error: 'BuildBase is not configured yet.' }, { status: 400 })
	}
	const formData = await request.formData()
	const redirectTo = formData.get('redirectTo')
	const state = newState()
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	authSession.set(signInStateKey, state)
	authSession.set(
		signInRedirectKey,
		typeof redirectTo === 'string' ? redirectTo : '',
	)
	return redirect(await getSignInUrl(request, state), {
		headers: {
			'set-cookie': await authSessionStorage.commitSession(authSession),
		},
	})
}

export default function LoginPage({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const [searchParams] = useSearchParams()
	const isPending = useIsPending()

	return (
		<div className="flex min-h-full flex-col justify-center pt-20 pb-32">
			<div className="mx-auto w-full max-w-md">
				<div className="flex flex-col gap-3 text-center">
					<h1 className="text-h1">Welcome back!</h1>
					<p className="text-body-md text-muted-foreground">
						Sign in or create an account on the secure sign-in page.
					</p>
				</div>
				<div className="mx-auto mt-10 w-full max-w-md px-8">
					{loaderData.configured ? null : (
						<p className="text-body-sm text-foreground-destructive mb-4">
							Set BUILDBASE_ORG_ID, BUILDBASE_CLIENT_ID and
							BUILDBASE_CLIENT_SECRET to enable sign-in. The README walks
							through each one.
						</p>
					)}
					<Form method="POST">
						<input
							type="hidden"
							name="redirectTo"
							value={searchParams.get('redirectTo') ?? ''}
						/>
						<StatusButton
							className="w-full"
							status={isPending ? 'pending' : actionData ? 'error' : 'idle'}
							type="submit"
							disabled={isPending || !loaderData.configured}
						>
							Continue to sign in
						</StatusButton>
					</Form>
					<p className="text-body-xs text-muted-foreground mt-6 text-center">
						Email, magic link, social sign-in, passkeys and two-factor
						authentication, secured by BuildBase.
					</p>
				</div>
			</div>
		</div>
	)
}

export const meta: Route.MetaFunction = () => {
	return [{ title: 'Login to Epic Notes' }]
}

export function ErrorBoundary() {
	return <GeneralErrorBoundary />
}
