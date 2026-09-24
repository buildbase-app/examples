// Added for the BuildBase example: the BuildBase calls this API makes. Starting
// sign-in, exchanging the code, reading the user behind a session (cached for a
// minute, so every request is not a round trip), and ending a session.
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiVersion, AuthApi, BuildBase } from '@buildbase/sdk';
import { AllConfigType } from '../config/config.type';

export type BuildBaseProfile = { id: string; email: string; name?: string };

const PROFILE_TTL_MS = 60_000;

@Injectable()
export class BuildBaseService {
  private readonly profiles = new Map<
    string,
    { profile: BuildBaseProfile; expires: number }
  >();
  private client?: ReturnType<typeof BuildBase>;

  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  private get config() {
    return this.configService.getOrThrow('auth', { infer: true });
  }

  private requireConfigured() {
    const { buildbaseOrgId, buildbaseClientId, buildbaseClientSecret } =
      this.config;
    if (!buildbaseOrgId || !buildbaseClientId || !buildbaseClientSecret) {
      throw new ServiceUnavailableException(
        'Set BUILDBASE_ORG_ID, BUILDBASE_CLIENT_ID and BUILDBASE_CLIENT_SECRET',
      );
    }
    return {
      orgId: buildbaseOrgId,
      clientId: buildbaseClientId,
      clientSecret: buildbaseClientSecret,
    };
  }

  private authApi() {
    return new AuthApi({
      serverUrl: this.config.buildbaseServerUrl,
      version: ApiVersion.V1,
    });
  }

  /** The hosted sign-in page, returning to `redirectUrl` with a code. */
  async signInUrl(redirectUrl: string, state?: string): Promise<string> {
    const { orgId, clientId } = this.requireConfigured();
    const { redirectUrl: url } = await this.authApi().requestAuth({
      orgId,
      clientId,
      redirect: { success: redirectUrl, error: redirectUrl },
      state,
    });
    return url;
  }

  /** Exchange the one-time code for a BuildBase session ID. */
  async exchangeCode(code: string): Promise<string> {
    const { orgId, clientId, clientSecret } = this.requireConfigured();
    const res = await fetch(
      `${this.config.buildbaseServerUrl}/api/v1/auth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, orgId, clientId, clientSecret }),
      },
    );
    if (!res.ok) throw new UnauthorizedException('invalidCode');
    const { data } = (await res.json()) as { data: { sessionId: string } };
    return data.sessionId;
  }

  /** The BuildBase user behind a session, or 401 if it is not valid. */
  async profile(sessionId: string): Promise<BuildBaseProfile> {
    const now = Date.now();
    const cached = this.profiles.get(sessionId);
    if (cached && cached.expires > now) return cached.profile;
    if (cached) this.profiles.delete(sessionId);

    const { orgId } = this.requireConfigured();
    this.client ??= BuildBase({
      serverUrl: this.config.buildbaseServerUrl,
      orgId,
    });
    // Nest has no async request context: bind the session per call.
    const user = await this.client
      .withSession(sessionId)
      .users.getProfile()
      .catch(() => {
        throw new UnauthorizedException();
      });
    // The profile API returns `id`; older SDK types call it `_id`.
    const { id, _id, email, name } = user as typeof user & { id?: string };
    // Never String() a missing ID: every such user would share one account.
    if (!(id ?? _id) || !email) throw new UnauthorizedException();
    const profile = { id: String(id ?? _id), email, name };
    // Drop expired entries as we go, so the cache holds only the sessions
    // seen in the last minute rather than every session ever seen.
    for (const [key, entry] of this.profiles) {
      if (entry.expires <= now) this.profiles.delete(key);
    }
    this.profiles.set(sessionId, {
      profile,
      expires: now + PROFILE_TTL_MS,
    });
    return profile;
  }

  /** End the BuildBase session itself. */
  async revoke(sessionId: string): Promise<void> {
    this.profiles.delete(sessionId);
    await this.authApi()
      .logout(sessionId)
      .catch(() => undefined);
  }
}
