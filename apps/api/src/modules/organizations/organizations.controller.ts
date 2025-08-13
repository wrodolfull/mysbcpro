import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import type { OrganizationDTO } from '@mysbc/shared';
import { OrganizationsService } from './organizations.service';

@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Post()
  upsert(@Body() org: OrganizationDTO) {
    return this.orgs.upsert(org);
  }

  @Patch(':id/block')
  setBlock(@Param('id') id: string, @Body() body: { blocked: boolean; reason?: string }) {
    return this.orgs.block(id, body.blocked, body.reason);
  }
}

