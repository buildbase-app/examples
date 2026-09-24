// Modified from brocoders/nestjs-boilerplate: sign-in goes through BuildBase's
// hosted page. A client asks for the page URL, sends the person there, and
// posts the code it gets back to /auth/buildbase/login for an API token (a
// BuildBase session ID). /me, PATCH /me, DELETE /me and /logout are upstream's
// endpoints on that token.
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
  Post,
  Query,
  Request,
  SerializeOptions,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AllConfigType } from '../config/config.type';
import { User } from '../users/domain/user';
import { NullableType } from '../utils/types/nullable.type';
import type { RequestWithUser } from '../utils/types/request-with-user.type';
import { AuthService } from './auth.service';
import { BuildBaseAuthGuard } from './buildbase-auth.guard';
import { AuthBuildBaseLoginDto } from './dto/auth-buildbase-login.dto';
import { AuthUpdateDto } from './dto/auth-update.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SignInUrlResponseDto } from './dto/sign-in-url-response.dto';
import type { AuthUserType } from './types/auth-user.type';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @Get('buildbase/url')
  @ApiQuery({
    name: 'redirect',
    description:
      'Where the hosted page returns with ?code=. Must be registered on your BuildBase auth client.',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description:
      'A random value the client keeps and compares when the hosted page returns with it, so a sign-in it did not start is refused.',
  })
  @ApiOkResponse({ type: SignInUrlResponseDto })
  async signInUrl(
    @Query('redirect') redirect: string,
    @Query('state') state?: string,
  ): Promise<SignInUrlResponseDto> {
    return { url: await this.service.signInUrl(redirect, state) };
  }

  @SerializeOptions({
    groups: ['me'],
  })
  @Post('buildbase/login')
  @ApiOkResponse({
    type: LoginResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  public login(
    @Body() loginDto: AuthBuildBaseLoginDto,
  ): Promise<LoginResponseDto> {
    return this.service.login(loginDto.code);
  }

  /**
   * A convenience for trying the API without a frontend: register this URL as
   * the redirect, and the page shows a token to paste into Swagger's
   * Authorize. Off in production, where a frontend posts the code instead.
   */
  @Get('buildbase/callback')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async callback(@Query('code') code: string): Promise<string> {
    const { nodeEnv } = this.configService.getOrThrow('app', { infer: true });
    if (nodeEnv === 'production' || !code) throw new NotFoundException();
    const { token, user } = await this.service.login(code);
    return `<!doctype html><title>Signed in</title><body style="font-family:system-ui;max-width:640px;margin:48px auto;line-height:1.5">
<h1>Signed in as ${escapeHtml(user.email ?? '')}</h1>
<p>Your API token (a BuildBase session). In <a href="/docs">Swagger</a>, click <b>Authorize</b> and paste it.</p>
<pre id="token" style="background:#f4f4f5;padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all">${escapeHtml(token)}</pre>
<p><a href="/docs">Open the API docs</a></p></body>`;
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('me')
  @UseGuards(BuildBaseAuthGuard)
  @ApiOkResponse({
    type: User,
  })
  @HttpCode(HttpStatus.OK)
  public me(
    @Request() request: RequestWithUser<AuthUserType>,
  ): Promise<NullableType<User>> {
    return this.service.me(request.user);
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(BuildBaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(
    @Request() request: RequestWithUser<AuthUserType>,
  ): Promise<void> {
    await this.service.logout(request.user);
  }

  @ApiBearerAuth()
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('me')
  @UseGuards(BuildBaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: User,
  })
  public update(
    @Request() request: RequestWithUser<AuthUserType>,
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.service.update(request.user, userDto);
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(BuildBaseAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(
    @Request() request: RequestWithUser<AuthUserType>,
  ): Promise<void> {
    return this.service.softDelete(request.user);
  }
}
