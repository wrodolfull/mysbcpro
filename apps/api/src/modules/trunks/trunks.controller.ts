import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import type { TrunkDTO } from '@mysbc/shared';
import { TrunksService } from './trunks.service';

@Controller('trunks')
export class TrunksController {
  constructor(private readonly trunks: TrunksService) {}

  @Get(':orgId')
  list(@Param('orgId') orgId: string) {
    return this.trunks.list(orgId);
  }

  @Post(':orgId/publish')
  publish(@Param('orgId') orgId: string, @Body() trunk: TrunkDTO) {
    return this.trunks.upsert({ ...trunk, organizationId: orgId });
  }

  @Delete(':orgId/:id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.trunks.remove(orgId, id);
  }
}

