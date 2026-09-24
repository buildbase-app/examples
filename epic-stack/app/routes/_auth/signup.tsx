// Modified from epicweb-dev/epic-stack: sign-up is on BuildBase's hosted page,
// next to sign-in.
import { redirect } from 'react-router'

export function loader() {
	return redirect('/login')
}
