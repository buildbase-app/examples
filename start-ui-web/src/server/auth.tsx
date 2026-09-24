// Modified from BearStudio/start-ui-web: BuildBase's hosted page replaces the
// email one-time code and GitHub OAuth (see ./buildbase-auth.ts). better-auth
// stays as the session, admin and permissions layer.
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, openAPI } from 'better-auth/plugins';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { permissions } from '@/features/auth/permissions';
import { buildbaseAuth } from '@/server/buildbase-auth';
import { db } from '@/server/db';

export type Auth = typeof auth;
export const auth = betterAuth({
  baseURL: {
    allowedHosts: [
      new URL(envClient.VITE_BASE_URL).host,
      ...(envServer.AUTH_ALLOWED_HOSTS ?? []),
    ],
  },
  session: {
    expiresIn: envServer.AUTH_SESSION_EXPIRATION_IN_SECONDS,
    updateAge: envServer.AUTH_SESSION_UPDATE_AGE_IN_SECONDS,
  },
  trustedOrigins: envServer.AUTH_TRUSTED_ORIGINS,
  database: prismaAdapter(db, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      onboardedAt: {
        type: 'date',
      },
    },
  },
  onAPIError: {
    throw: true,
    errorURL: '/login/error',
  },

  plugins: [
    /**
     * Allows an Expo native app to use auth, can be deleted if not needed.
     * disableOriginOverride: workaround for a crash in onRequest. Learn more at:
     * https://github.com/better-auth/better-auth/issues/1058
     */
    expo({ disableOriginOverride: true }),
    openAPI({
      disableDefaultReference: true, // Use custom exposition in /routes/api/openapi folder
    }),
    admin({
      ...permissions,
    }),
    buildbaseAuth({
      serverUrl: envClient.VITE_BUILDBASE_SERVER_URL,
      orgId: envClient.VITE_BUILDBASE_ORG_ID,
      clientId: envClient.VITE_BUILDBASE_CLIENT_ID,
      clientSecret: envServer.BUILDBASE_CLIENT_SECRET,
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (envClient.VITE_IS_DEMO) throw new Error('DEMO MODE');
          return { data: user };
        },
      },
      update: {
        before: async (user) => {
          if (envClient.VITE_IS_DEMO) throw new Error('DEMO MODE');
          return { data: user };
        },
      },
    },
  },
});
