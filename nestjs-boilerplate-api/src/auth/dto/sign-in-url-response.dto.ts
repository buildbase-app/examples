// Added for the BuildBase example.
import { ApiProperty } from '@nestjs/swagger';

export class SignInUrlResponseDto {
  @ApiProperty({ description: "BuildBase's hosted sign-in page" })
  url: string;
}
