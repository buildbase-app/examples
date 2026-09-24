// Added for the BuildBase example: what the guard puts on request.user. The
// same id and role the JWT payload carried, so RolesGuard is unchanged, and
// the BuildBase session the request came with.
import { User } from '../../users/domain/user';

export type AuthUserType = Pick<User, 'id' | 'role'> & {
  sessionId: string;
};
