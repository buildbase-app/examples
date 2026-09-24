// Modified from brocoders/nestjs-boilerplate: reads the user the BuildBase guard set.
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUserType } from '../auth/types/auth-user.type';
import type { RequestWithUser } from '../utils/types/request-with-user.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<
      (number | string)[] | undefined
    >('roles', [context.getClass(), context.getHandler()]);
    if (!roles?.length) {
      return true;
    }
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser<AuthUserType | undefined>>();

    return roles.map(String).includes(String(request.user?.role?.id));
  }
}
