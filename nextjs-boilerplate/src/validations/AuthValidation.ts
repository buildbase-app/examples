// Added for the BuildBase example.
import * as z from 'zod';

/** What the SDK posts to /api/auth/verify after the hosted page. */
export const VerifyValidation = z.object({
  code: z.string().min(1),
});

/** BuildBase's answer to the code exchange. */
export const TokenResponseValidation = z.object({
  data: z.object({ sessionId: z.string() }),
});

/** Our own /api/auth/* answers, read back in the browser. */
export const SessionResponseValidation = z.object({
  sessionId: z.string().nullable(),
});
