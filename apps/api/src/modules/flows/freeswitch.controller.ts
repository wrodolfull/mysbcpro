import { Body, Controller, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface SaveIVRRequest {
  flowName: string;
  xml: string;
  organizationId: string;
  targetPath: string;
}

interface SaveIVRResponse {
  success: boolean;
  message: string;
  filePath?: string;
}

@ApiTags('FreeSwitch')
@Controller('freeswitch')
export class FreeSwitchController {
  private readonly logger = new Logger(FreeSwitchController.name);

  @Post('save-ivr')
  @ApiOperation({ summary: 'Save IVR XML file to FreeSwitch directory' })
  @ApiBody({ description: 'IVR configuration data' })
  @ApiResponse({ status: 200, description: 'IVR file saved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 500, description: 'Failed to save IVR file' })
  async saveIVR(@Body() request: SaveIVRRequest): Promise<SaveIVRResponse> {
    try {
      this.logger.log(`Saving IVR for flow: ${request.flowName}, org: ${request.organizationId}`);

      // Validar dados de entrada
      if (!request.flowName || !request.xml || !request.organizationId) {
        throw new Error('Missing required fields: flowName, xml, organizationId');
      }

      // Sempre usar o diretório real do FreeSwitch
      let targetDir = request.targetPath;
      
      if (!targetDir) {
        targetDir = '/usr/local/freeswitch/conf/ivr_menus/';
      }

      // Criar diretório se não existir
      if (!existsSync(targetDir)) {
        this.logger.log(`Creating directory: ${targetDir}`);
        try {
          mkdirSync(targetDir, { recursive: true });
        } catch (mkdirError) {
          this.logger.error(`Failed to create directory ${targetDir}:`, mkdirError);
          const errorMessage = mkdirError instanceof Error ? mkdirError.message : 'Unknown error';
          throw new Error(`Cannot create directory: ${errorMessage}`);
        }
      }

      // Nome do arquivo baseado no nome do flow e organização
      const fileName = `${request.organizationId}_${request.flowName}.xml`;
      const filePath = join(targetDir, fileName);

      // Salvar arquivo XML
      this.logger.log(`Writing XML file to: ${filePath}`);
      try {
        writeFileSync(filePath, request.xml, 'utf8');
      } catch (writeError) {
        this.logger.error(`Failed to write file ${filePath}:`, writeError);
        const errorMessage = writeError instanceof Error ? writeError.message : 'Unknown error';
        throw new Error(`Cannot write file: ${errorMessage}`);
      }

      this.logger.log(`IVR file saved successfully: ${filePath}`);

      return {
        success: true,
        message: 'IVR file saved successfully',
        filePath: filePath
      };

    } catch (error) {
      this.logger.error('Failed to save IVR file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        message: `Failed to save IVR file: ${errorMessage}`
      };
    }
  }
}
