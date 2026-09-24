// Added for the BuildBase example: a Vercel Function. Locally, vite.config.ts
// serves the same handler.
import { verify } from '../../server/auth'

export const POST = verify
