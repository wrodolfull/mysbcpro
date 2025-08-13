import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import type { InboundDTO } from '@mysbc/shared';
import { InboundsService } from './inbounds.service';

@Controller('inbounds')
export class InboundsController {
  constructor(private readonly inbounds: InboundsService) {}

  @Get(':orgId')
  list(@Param('orgId') orgId: string) {
    return this.inbounds.list(orgId);
  }

  @Post(':orgId/publish')
  publish(@Param('orgId') orgId: string, @Body() inbound: InboundDTO) {
    return this.inbounds.upsert({ ...inbound, organizationId: orgId });
  }

  @Delete(':orgId/:id')
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.inbounds.remove(orgId, id);
  }
}

