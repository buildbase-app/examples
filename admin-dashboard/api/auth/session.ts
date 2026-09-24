// Added for the BuildBase example: a Vercel Function. Locally, vite.config.ts
// serves the same handler.
import { session } from '../../server/auth'

export const GET = session
