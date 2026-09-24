// Modified from brocoders/nestjs-boilerplate: the token is a BuildBase session
// ID. Send it as `Authorization: Bearer <token>`; there is no refresh token,
// because BuildBase manages the session's lifetime.
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/domain/user';

export class LoginResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty({
    type: () => User,
  })
  user: User;
}
