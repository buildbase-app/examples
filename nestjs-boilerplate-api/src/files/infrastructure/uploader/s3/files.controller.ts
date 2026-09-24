// Modified from brocoders/nestjs-boilerplate: BuildBaseAuthGuard replaces AuthGuard('jwt').
import { BuildBaseAuthGuard } from '../../../../auth/buildbase-auth.guard';
import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FilesS3Service } from './files.service';
import { FileResponseDto } from './dto/file-response.dto';

@ApiTags('Files')
@Controller({
  path: 'files',
  version: '1',
})
export class FilesS3Controller {
  constructor(private readonly filesService: FilesS3Service) {}

  @ApiCreatedResponse({
    type: FileResponseDto,
  })
  @ApiBearerAuth()
  @UseGuards(BuildBaseAuthGuard)
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.MulterS3.File,
  ): Promise<FileResponseDto> {
    return this.filesService.create(file);
  }
}
