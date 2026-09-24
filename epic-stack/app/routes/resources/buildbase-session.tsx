// Added for the BuildBase example: the React SDK in the browser asks here for
// the BuildBase session. The cookie that holds it stays httpOnly.
import { getBuildBaseSessionId, getUserId } from '#app/utils/auth.server.ts'
import { type Route } from './+types/buildbase-session.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await getUserId(request)
	const sessionId = userId ? await getBuildBaseSessionId(request) : null
	return Response.json(
		{ sessionId },
		{ headers: { 'Cache-Control': 'no-store' } },
	)
}
