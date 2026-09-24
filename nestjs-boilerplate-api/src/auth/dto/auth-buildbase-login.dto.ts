// Added for the BuildBase example.
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthBuildBaseLoginDto {
  @ApiProperty({
    description:
      'The one-time code the hosted sign-in page added to your redirect URL',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
