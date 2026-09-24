// Modified from brocoders/nestjs-boilerplate: the Apple, Facebook, Google and
// mail configs went with their modules; auth now holds BuildBase settings.
import { AppConfig } from './app-config.type';
import { AuthConfig } from '../auth/config/auth-config.type';
import { DatabaseConfig } from '../database/config/database-config.type';
import { FileConfig } from '../files/config/file-config.type';

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  file: FileConfig;
};
