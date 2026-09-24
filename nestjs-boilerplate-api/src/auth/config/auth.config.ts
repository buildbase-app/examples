// Modified from brocoders/nestjs-boilerplate: BuildBase settings replace the
// JWT secrets. Optional, so the API boots before it is connected; sign-in
// answers 503 until they are set.
import { registerAs } from '@nestjs/config';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import validateConfig from '../../utils/validate-config';
import { AuthConfig } from './auth-config.type';

class EnvironmentVariablesValidator {
  @IsUrl({ require_tld: false })
  @IsOptional()
  BUILDBASE_SERVER_URL: string;

  @IsString()
  @IsOptional()
  BUILDBASE_ORG_ID: string;

  @IsString()
  @IsOptional()
  BUILDBASE_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  BUILDBASE_CLIENT_SECRET: string;
}

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    buildbaseServerUrl:
      process.env.BUILDBASE_SERVER_URL || 'https://api.console.buildbase.app',
    buildbaseOrgId: process.env.BUILDBASE_ORG_ID,
    buildbaseClientId: process.env.BUILDBASE_CLIENT_ID,
    buildbaseClientSecret: process.env.BUILDBASE_CLIENT_SECRET,
  };
});
