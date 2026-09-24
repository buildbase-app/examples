// Modified from brocoders/nestjs-boilerplate: BuildBase settings replace the
// JWT, refresh, forgot-password and confirm-email secrets.
export type AuthConfig = {
  buildbaseServerUrl: string;
  buildbaseOrgId?: string;
  buildbaseClientId?: string;
  buildbaseClientSecret?: string;
};
