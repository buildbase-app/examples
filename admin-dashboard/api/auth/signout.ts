// Added for the BuildBase example: a Vercel Function. Locally, vite.config.ts
// serves the same handler.
import { signout } from '../../server/auth'

export const POST = signout
