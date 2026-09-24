// Added for the BuildBase example: the sign-in rules, with BuildBase and the
// database stubbed, so they run without either.
import { RoleEnum } from '../roles/roles.enum';
import { User } from '../users/domain/user';
import { UsersService } from '../users/users.service';
import { AuthProvidersEnum } from './auth-providers.enum';
import { AuthService } from './auth.service';
import { BuildBaseService } from './buildbase.service';

const profile = { id: 'bb-user-1', email: 'Ada@Example.com', name: 'Ada King' };

function setup(existing: { bySocial?: User; byEmail?: User } = {}) {
  const created = { id: 7, role: { id: RoleEnum.user } } as User;
  const users = {
    findBySocialIdAndProvider: jest
      .fn()
      .mockResolvedValue(existing.bySocial ?? null),
    findByEmail: jest.fn().mockResolvedValue(existing.byEmail ?? null),
    findById: jest
      .fn()
      .mockImplementation((id: number) =>
        Promise.resolve(
          id === created.id ? created : (existing.byEmail ?? null),
        ),
      ),
    create: jest.fn().mockResolvedValue(created),
    update: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  const buildbase = {
    exchangeCode: jest.fn().mockResolvedValue('session-123'),
    profile: jest.fn().mockResolvedValue(profile),
    revoke: jest.fn().mockResolvedValue(undefined),
    signInUrl: jest.fn(),
  };
  const service = new AuthService(
    users as unknown as UsersService,
    buildbase as unknown as BuildBaseService,
  );
  return { service, users, buildbase, created };
}

describe('AuthService', () => {
  it('should log in with the code and return the BuildBase session as the token', async () => {
    const { service, buildbase, created } = setup();
    const result = await service.login('the-code');
    expect(buildbase.exchangeCode).toHaveBeenCalledWith('the-code');
    expect(result).toEqual({ token: 'session-123', user: created });
  });

  it('should create a user on first sign-in, with the user role and a split name', async () => {
    const { service, users } = setup();
    await service.userForSession('session-123');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'King',
        socialId: 'bb-user-1',
        provider: AuthProvidersEnum.buildbase,
        role: { id: RoleEnum.user },
      }),
    );
  });

  it('should find a returning user by BuildBase ID, without creating one', async () => {
    const returning = { id: 3, role: { id: RoleEnum.admin } } as User;
    const { service, users } = setup({ bySocial: returning });
    const user = await service.userForSession('session-123');
    expect(user).toEqual({
      id: 3,
      role: { id: RoleEnum.admin },
      sessionId: 'session-123',
    });
    expect(users.create).not.toHaveBeenCalled();
  });

  it('should adopt a user from before BuildBase by email', async () => {
    const legacy = { id: 9, role: { id: RoleEnum.user } } as User;
    const { service, users } = setup({ byEmail: legacy });
    await service.userForSession('session-123');
    expect(users.update).toHaveBeenCalledWith(9, {
      provider: AuthProvidersEnum.buildbase,
      socialId: 'bb-user-1',
    });
    expect(users.create).not.toHaveBeenCalled();
  });

  it('should end the BuildBase session on logout and on delete', async () => {
    const { service, users, buildbase } = setup();
    const me = { id: 7, role: { id: RoleEnum.user }, sessionId: 'session-123' };
    await service.logout(me);
    await service.softDelete(me);
    expect(buildbase.revoke).toHaveBeenCalledTimes(2);
    expect(users.remove).toHaveBeenCalledWith(7);
  });
});
