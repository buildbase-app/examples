// Modified from ixartz/Next-js-Boilerplate: BuildBase replaces the Clerk keys.
import { createEnv } from '@t3-oss/env-nextjs';
import * as z from 'zod';

export const Env = createEnv({
  server: {
    ARCJET_KEY: z.string().startsWith('ajkey_').optional(),
    // BuildBase: optional, so the app builds before it is connected (it then
    // shows setup steps instead of signing in).
    BUILDBASE_CLIENT_SECRET: z.string().optional(),
    DATABASE_URL: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().optional(),
    NEXT_PUBLIC_BUILDBASE_SERVER_URL: z.string().default('https://api.console.buildbase.app'),
    NEXT_PUBLIC_BUILDBASE_ORG_ID: z.string().optional(),
    NEXT_PUBLIC_BUILDBASE_CLIENT_ID: z.string().optional(),
    NEXT_PUBLIC_BUILDBASE_REDIRECT_URL: z.string().optional(),
    NEXT_PUBLIC_LOGGING_LEVEL: z
      .enum(['error', 'info', 'debug', 'warning', 'trace', 'fatal'])
      .default('info'),
    NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN: z.string().optional(),
    NEXT_PUBLIC_BETTER_STACK_INGESTING_HOST: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  },
  shared: {
    NODE_ENV: z.enum(['test', 'development', 'production']).optional(),
  },
  // You need to destructure all the keys manually
  runtimeEnv: {
    ARCJET_KEY: process.env.ARCJET_KEY,
    BUILDBASE_CLIENT_SECRET: process.env.BUILDBASE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_BUILDBASE_SERVER_URL: process.env.NEXT_PUBLIC_BUILDBASE_SERVER_URL,
    NEXT_PUBLIC_BUILDBASE_ORG_ID: process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID,
    NEXT_PUBLIC_BUILDBASE_CLIENT_ID: process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID,
    NEXT_PUBLIC_BUILDBASE_REDIRECT_URL: process.env.NEXT_PUBLIC_BUILDBASE_REDIRECT_URL,
    NEXT_PUBLIC_LOGGING_LEVEL: process.env.NEXT_PUBLIC_LOGGING_LEVEL,
    NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN: process.env.NEXT_PUBLIC_BETTER_STACK_SOURCE_TOKEN,
    NEXT_PUBLIC_BETTER_STACK_INGESTING_HOST: process.env.NEXT_PUBLIC_BETTER_STACK_INGESTING_HOST,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NODE_ENV: process.env.NODE_ENV,
  },
});
