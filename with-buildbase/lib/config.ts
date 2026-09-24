/** True once the org and auth client are set; until then the app shows setup steps. */
export const isConfigured = Boolean(
  process.env.NEXT_PUBLIC_BUILDBASE_ORG_ID &&
  process.env.NEXT_PUBLIC_BUILDBASE_CLIENT_ID
);
