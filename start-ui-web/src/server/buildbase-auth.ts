// Added for the BuildBase example: a better-auth plugin that makes BuildBase's
// hosted page the way in. BuildBase proves who someone is; better-auth then
// opens its own session exactly as it would for a social login, so the admin
// plugin, permissions and every oRPC procedure keep working unchanged.
import { ApiVersion, AuthApi, BuildBase } from '@buildbase/sdk';
import type { BetterAuthPlugin } from 'better-auth';
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
  getSessionFromCtx,
} from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

type BuildBaseAuthOptions = {
  serverUrl: string;
  orgId?: string;
  clientId?: string;
  clientSecret?: string;
};

const STATE_COOKIE = 'buildbase_state';

/**
 * Where to land after sign-in: a path on this site, or '/'. The app passes
 * absolute URLs (`?redirect=http://host/manager/users`), so same-origin URLs
 * are accepted too; anything else is dropped, so this is never an open
 * redirect.
 */
const sameOriginPath = (target: string | undefined, baseURL: string) => {
  if (!target) return '/';
  if (target.startsWith('/') && !target.startsWith('//')) return target;
  try {
    const url = new URL(target);
    if (url.origin === new URL(baseURL).origin) return url.pathname + url.search;
  } catch {
    // not a URL
  }
  return '/';
};
/** The account row that ties a better-auth user to a BuildBase user. */
const PROVIDER_ID = 'buildbase';

export const buildbaseAuth = (options: BuildBaseAuthOptions) => {
  const authApi = () =>
    new AuthApi({ serverUrl: options.serverUrl, version: ApiVersion.V1 });

  const configured = () => {
    const { orgId, clientId, clientSecret } = options;
    if (!orgId || !clientId || !clientSecret) {
      throw new APIError('SERVICE_UNAVAILABLE', {
        message:
          'Set VITE_BUILDBASE_ORG_ID, VITE_BUILDBASE_CLIENT_ID and BUILDBASE_CLIENT_SECRET',
      });
    }
    return { orgId, clientId, clientSecret };
  };

  let client: ReturnType<typeof BuildBase> | undefined;

  return {
    id: 'buildbase',
    schema: {
      // The BuildBase session behind each better-auth session: signing out
      // ends it, and the React SDK's account screens use it.
      session: {
        fields: {
          buildbaseSessionId: { type: 'string', required: false },
        },
      },
    },
    endpoints: {
      /** GET /api/auth/buildbase/sign-in: off to the hosted page. */
      buildbaseSignIn: createAuthEndpoint(
        '/buildbase/sign-in',
        {
          method: 'GET',
          query: z.object({ redirectTo: z.string().optional() }),
        },
        async (ctx) => {
          const { orgId, clientId } = configured();
          const state = crypto.randomUUID();
          const redirectTo = sameOriginPath(
            ctx.query.redirectTo,
            ctx.context.baseURL,
          );
          await ctx.setSignedCookie(
            STATE_COOKIE,
            JSON.stringify({ state, redirectTo }),
            ctx.context.secret,
            {
              httpOnly: true,
              sameSite: 'lax',
              path: '/',
              maxAge: 600,
              secure: ctx.context.baseURL.startsWith('https'),
            },
          );
          const callback = `${ctx.context.baseURL}/buildbase/callback`;
          const { redirectUrl } = await authApi().requestAuth({
            orgId,
            clientId,
            redirect: { success: callback, error: callback },
            state,
          });
          throw ctx.redirect(redirectUrl);
        },
      ),

      /** GET /api/auth/buildbase/callback: back from the hosted page. */
      buildbaseCallback: createAuthEndpoint(
        '/buildbase/callback',
        {
          method: 'GET',
          query: z.object({
            code: z.string().optional(),
            state: z.string().optional(),
          }),
        },
        async (ctx) => {
          const { orgId, clientId, clientSecret } = configured();
          const raw = await ctx.getSignedCookie(
            STATE_COOKIE,
            ctx.context.secret,
          );
          const saved = raw
            ? (JSON.parse(raw) as { state: string; redirectTo: string })
            : null;
          const { code, state } = ctx.query;
          if (!code || !saved || (state && state !== saved.state)) {
            throw ctx.redirect('/login/error?error=STATE_MISMATCH');
          }

          const res = await fetch(`${options.serverUrl}/api/v1/auth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, orgId, clientId, clientSecret }),
          });
          if (!res.ok) throw ctx.redirect('/login/error?error=INVALID_CODE');
          const { data } = (await res.json()) as {
            data: { sessionId: string };
          };
          const buildbaseSessionId = data.sessionId;

          client ??= BuildBase({ serverUrl: options.serverUrl, orgId });
          const profile = await client
            .withSession(buildbaseSessionId)
            .users.getProfile();
          // The profile API returns `id`; older SDK types call it `_id`.
          const accountId = String(
            (profile as typeof profile & { id?: string }).id ?? profile._id,
          );
          const email = profile.email.toLowerCase();
          const adapter = ctx.context.internalAdapter;

          const owner = await adapter.findAccountOwnerByKey({
            providerId: PROVIDER_ID,
            accountId,
          });
          let user = owner?.kind === 'owned' ? owner.user : null;
          if (!user) {
            const existing = await adapter.findUserByEmail(email);
            if (existing) {
              // A user from before BuildBase, with the same email, is adopted.
              await adapter.linkAccount({
                userId: existing.user.id,
                providerId: PROVIDER_ID,
                accountId,
              });
              user = existing.user;
            } else {
              ({ user } = await adapter.createOAuthUser(
                {
                  email,
                  name: profile.name || email.split('@')[0]!,
                  emailVerified: true,
                  // BuildBase already knows the name: no onboarding step.
                  onboardedAt: new Date(),
                } as Parameters<typeof adapter.createOAuthUser>[0],
                { providerId: PROVIDER_ID, accountId },
              ));
            }
          }

          const session = await adapter.createSession(user.id, false, {
            buildbaseSessionId,
          });
          await setSessionCookie(ctx, { session, user });
          ctx.setCookie(STATE_COOKIE, '', { path: '/', maxAge: 0 });
          throw ctx.redirect(saved.redirectTo);
        },
      ),
    },
    hooks: {
      before: [
        {
          // Signing out here ends the BuildBase session too.
          matcher: (ctx) => ctx.path === '/sign-out',
          handler: createAuthMiddleware(async (ctx) => {
            const current = await getSessionFromCtx(ctx).catch(() => null);
            const buildbaseSessionId = (
              current?.session as { buildbaseSessionId?: string } | undefined
            )?.buildbaseSessionId;
            if (buildbaseSessionId) {
              await authApi()
                .logout(buildbaseSessionId)
                .catch(() => undefined);
            }
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
};
