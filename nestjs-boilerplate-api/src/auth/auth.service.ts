// Modified from brocoders/nestjs-boilerplate: BuildBase proves who someone is.
// This service turns that into the app's own User, the way upstream's social
// login did (find by provider ID, adopt by email, or create), and keeps the
// profile endpoints. Email/password, confirmation, reset, refresh tokens and
// the Apple, Facebook and Google flows are gone.
import {
  HttpStatus,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RoleEnum } from '../roles/roles.enum';
import { StatusEnum } from '../statuses/statuses.enum';
import { User } from '../users/domain/user';
import { UsersService } from '../users/users.service';
import { NullableType } from '../utils/types/nullable.type';
import { AuthProvidersEnum } from './auth-providers.enum';
import { BuildBaseProfile, BuildBaseService } from './buildbase.service';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { AuthUserType } from './types/auth-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly buildbase: BuildBaseService,
  ) {}

  signInUrl(redirectUrl: string, state?: string): Promise<string> {
    return this.buildbase.signInUrl(redirectUrl, state);
  }

  /** Exchange the hosted page's code; the session ID is the API token. */
  async login(code: string): Promise<LoginResponseDto> {
    const token = await this.buildbase.exchangeCode(code);
    const user = await this.resolveUser(await this.buildbase.profile(token));
    return { token, user };
  }

  /** What the guard puts on request.user for a BuildBase session. */
  async userForSession(sessionId: string): Promise<AuthUserType> {
    const user = await this.resolveUser(
      await this.buildbase.profile(sessionId),
    );
    return { id: user.id, role: user.role, sessionId };
  }

  private async resolveUser(profile: BuildBaseProfile): Promise<User> {
    const email = profile.email?.toLowerCase() ?? null;
    let user = await this.usersService.findBySocialIdAndProvider({
      socialId: profile.id,
      provider: AuthProvidersEnum.buildbase,
    });

    if (!user && email) {
      // A user from before BuildBase, with the same email, is adopted.
      const userByEmail = await this.usersService.findByEmail(email);
      if (userByEmail) {
        await this.usersService.update(userByEmail.id, {
          provider: AuthProvidersEnum.buildbase,
          socialId: profile.id,
        });
        user = await this.usersService.findById(userByEmail.id);
      }
    }

    if (!user) {
      const [firstName, ...rest] = (profile.name ?? '').trim().split(/\s+/);
      const created = await this.usersService.create({
        email,
        firstName: firstName || null,
        lastName: rest.join(' ') || null,
        socialId: profile.id,
        provider: AuthProvidersEnum.buildbase,
        role: { id: RoleEnum.user },
        status: { id: StatusEnum.active },
      });
      user = await this.usersService.findById(created.id);
    }

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { user: 'userNotFound' },
      });
    }
    return user;
  }

  me(authUser: AuthUserType): Promise<NullableType<User>> {
    return this.usersService.findById(authUser.id);
  }

  async update(
    authUser: AuthUserType,
    userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    await this.usersService.update(authUser.id, userDto);
    return this.usersService.findById(authUser.id);
  }

  /** Deletes this app's data. The BuildBase account stays. */
  async softDelete(authUser: AuthUserType): Promise<void> {
    await this.usersService.remove(authUser.id);
    await this.buildbase.revoke(authUser.sessionId);
  }

  /** Ends the BuildBase session, so the token stops working everywhere. */
  logout(authUser: AuthUserType): Promise<void> {
    return this.buildbase.revoke(authUser.sessionId);
  }
}
