import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Post, 
  Query, 
  UploadedFile, 
  UseInterceptors 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import type { TtsRequestDTO } from '@mysbc/shared';
import { AudioService } from './audio.service';

// Define o tipo do arquivo para evitar problemas com Express.Multer
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@ApiTags('Audio & TTS')
@Controller('audio')
export class AudioController {
  constructor(private readonly audio: AudioService) {}

  @Get(':orgId')
  @ApiOperation({ summary: 'List all audio files for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type (uploaded/tts)' })
  @ApiResponse({ status: 200, description: 'List of audio files' })
  async list(
    @Param('orgId') orgId: string,
    @Query('type') type?: string
  ) {
    return this.audio.list(orgId, type as any);
  }

  @Get(':orgId/:id')
  @ApiOperation({ summary: 'Get audio file details by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Audio file ID' })
  @ApiResponse({ status: 200, description: 'Audio file details' })
  @ApiResponse({ status: 404, description: 'Audio file not found' })
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.audio.findOne(orgId, id);
  }

  @Post(':orgId/upload')
  @ApiOperation({ summary: 'Upload audio file' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Audio file uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('orgId') orgId: string,
    @UploadedFile() file: MulterFile,
    @Body('name') name?: string
  ) {
    return this.audio.upload(orgId, file, name);
  }

  @Post(':orgId/tts')
  @ApiOperation({ summary: 'Generate TTS audio file' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiBody({ description: 'TTS request data' })
  @ApiResponse({ status: 201, description: 'TTS audio generated successfully' })
  @ApiResponse({ status: 400, description: 'TTS quota exceeded or invalid text' })
  async generateTts(@Param('orgId') orgId: string, @Body() request: TtsRequestDTO) {
    return this.audio.generateTts(orgId, request);
  }

  @Get(':orgId/quota')
  @ApiOperation({ summary: 'Get TTS quota usage for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'month', required: false, description: 'Month in YYYY-MM format (defaults to current)' })
  @ApiResponse({ status: 200, description: 'TTS quota information' })
  async getQuota(
    @Param('orgId') orgId: string,
    @Query('month') month?: string
  ) {
    return this.audio.getQuota(orgId, month);
  }

  @Delete(':orgId/:id')
  @ApiOperation({ summary: 'Delete audio file' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Audio file ID' })
  @ApiResponse({ status: 200, description: 'Audio file deleted successfully' })
  @ApiResponse({ status: 404, description: 'Audio file not found' })
  async remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.audio.remove(orgId, id);
  }
}

