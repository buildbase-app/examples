// Added for the BuildBase example.
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { BuildBaseAuthGuard } from './buildbase-auth.guard';

function contextWith(authorization?: string) {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { request, context };
}

describe('BuildBaseAuthGuard', () => {
  const authUser = { id: 1, role: { id: 2 }, sessionId: 'session-123' };
  const authService = {
    userForSession: jest.fn().mockResolvedValue(authUser),
  } as unknown as AuthService;
  const guard = new BuildBaseAuthGuard(authService);

  it('should put the user behind a Bearer session on the request', async () => {
    const { request, context } = contextWith('Bearer session-123');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(authUser);
  });

  it('should refuse a request without a Bearer token', async () => {
    await expect(
      guard.canActivate(contextWith().context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      guard.canActivate(contextWith('Basic abc').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
