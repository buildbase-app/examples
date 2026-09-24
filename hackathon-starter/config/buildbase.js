// Added for the BuildBase example: sign-in through BuildBase's hosted pages,
// and the server SDK for everything after it. Replaces the local, email-link,
// passkey and 2FA sign-in that lived in controllers/user.js and webauthn.js.
const crypto = require('node:crypto');
const { AuthApi, BuildBase } = require('@buildbase/sdk');

const SERVER_URL = process.env.BUILDBASE_SERVER_URL || 'https://api.console.buildbase.app';
const ORG_ID = process.env.BUILDBASE_ORG_ID;
const CLIENT_ID = process.env.BUILDBASE_CLIENT_ID;

/** Where the hosted page sends people back to. Register it on the auth client. */
const callbackUrl = () => `${process.env.BASE_URL}/auth/buildbase/callback`;

const isConfigured = () => Boolean(ORG_ID && CLIENT_ID && process.env.BUILDBASE_CLIENT_SECRET);

// One client for the app, made on first use: BuildBase() refuses to start
// without an org ID, and the app should still boot and show setup steps.
// Express has no async request context, so each request binds its own
// session with withSession() instead of a getSessionId callback.
let client;
const buildbase = () => {
  client ??= BuildBase({ serverUrl: SERVER_URL, orgId: ORG_ID });
  return client;
};
const authApi = new AuthApi({ serverUrl: SERVER_URL, version: 'v1' });

/** The signed-in user's BuildBase session, bound for this request. */
exports.forRequest = (req) => buildbase().withSession(req.session?.buildbaseSessionId);

exports.isConfigured = isConfigured;

/** Step 1: ask BuildBase for the hosted sign-in URL and send the visitor there. */
exports.startSignIn = async (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.buildbaseState = state;
  const { redirectUrl } = await authApi.requestAuth({
    orgId: ORG_ID,
    clientId: CLIENT_ID,
    redirect: { success: callbackUrl(), error: callbackUrl() },
    state,
  });
  res.redirect(redirectUrl);
};

/**
 * Step 2: the hosted page returns with a one-time code. Exchange it on the
 * server, where the client secret lives, for a BuildBase session ID.
 */
exports.exchangeCode = async (code) => {
  const res = await fetch(`${SERVER_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      orgId: ORG_ID,
      clientId: CLIENT_ID,
      clientSecret: process.env.BUILDBASE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`BuildBase token exchange failed (${res.status})`);
  const { data } = await res.json();
  return data.sessionId;
};

/** Ends the BuildBase session itself, not just this app's cookie. */
exports.revokeSession = async (sessionId, { everywhere = false } = {}) => {
  if (!sessionId) return;
  await authApi.logout(sessionId, everywhere ? { all: true } : undefined).catch(() => {});
};
