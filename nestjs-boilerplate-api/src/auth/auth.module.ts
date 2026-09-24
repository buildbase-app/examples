// Modified from brocoders/nestjs-boilerplate: Passport, JWT, sessions and mail
// are gone. Global, so UsersModule and FilesModule can use BuildBaseAuthGuard
// without importing this module back (which would be a cycle).
import { Global, Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BuildBaseAuthGuard } from './buildbase-auth.guard';
import { BuildBaseService } from './buildbase.service';

@Global()
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, BuildBaseService, BuildBaseAuthGuard],
  exports: [AuthService, BuildBaseAuthGuard],
})
export class AuthModule {}
