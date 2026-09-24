// Added for the BuildBase example: replaces AuthGuard('jwt'). The bearer token
// is a BuildBase session ID; BuildBase says who it belongs to, and the local
// user is found (or created on first use) from that.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestWithUser } from '../utils/types/request-with-user.type';
import { AuthService } from './auth.service';
import type { AuthUserType } from './types/auth-user.type';

@Injectable()
export class BuildBaseAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithUser<AuthUserType>>();
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException();

    request.user = await this.authService.userForSession(token);
    return true;
  }
}
