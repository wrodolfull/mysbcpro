import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { OrganizationDTO } from '@mysbc/shared';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization found' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  findById(@Param('id') id: string) {
    return this.orgs.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 409, description: 'Organization name already exists' })
  create(@Body() org: Omit<OrganizationDTO, 'id'>) {
    return this.orgs.create(org);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  update(
    @Param('id') id: string, 
    @Body() updates: Partial<Omit<OrganizationDTO, 'id'>>
  ) {
    return this.orgs.update(id, updates);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Block or unblock organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Organization block status updated' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  setBlock(@Param('id') id: string, @Body() body: { blocked: boolean; reason?: string }) {
    return this.orgs.block(id, body.blocked, body.reason);
  }
}

