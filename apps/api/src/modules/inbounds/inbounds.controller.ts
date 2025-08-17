import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { InboundDTO } from '@mysbc/shared';
import { InboundsService } from './inbounds.service';

@ApiTags('Inbounds')
@Controller('inbounds')
export class InboundsController {
  constructor(private readonly inbounds: InboundsService) {}

  @Get(':orgId')
  @ApiOperation({ summary: 'List all inbound connectors for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'context', required: false, description: 'Filter by context (public/default)' })
  @ApiQuery({ name: 'enabled', required: false, description: 'Filter by enabled status' })
  @ApiResponse({ status: 200, description: 'List of inbound connectors' })
  async list(
    @Param('orgId') orgId: string,
    @Query('context') context?: string,
    @Query('enabled') enabled?: string
  ) {
    return this.inbounds.list(
      orgId, 
      context as any, 
      enabled === 'true' ? true : enabled === 'false' ? false : undefined
    );
  }

  @Get(':orgId/:id')
  @ApiOperation({ summary: 'Get inbound connector by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inbound connector ID' })
  @ApiResponse({ status: 200, description: 'Inbound connector details' })
  @ApiResponse({ status: 404, description: 'Inbound connector not found' })
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.inbounds.findOne(orgId, id);
  }

  @Post(':orgId')
  @ApiOperation({ summary: 'Create new inbound connector' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiBody({ description: 'Inbound connector data' })
  @ApiResponse({ status: 201, description: 'Inbound connector created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid inbound connector data' })
  async create(@Param('orgId') orgId: string, @Body() inbound: Omit<InboundDTO, 'id' | 'organizationId'>) {
    return this.inbounds.create({ ...inbound, organizationId: orgId });
  }

  @Put(':orgId/:id')
  @ApiOperation({ summary: 'Update existing inbound connector' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inbound connector ID' })
  @ApiBody({ description: 'Updated inbound connector data' })
  @ApiResponse({ status: 200, description: 'Inbound connector updated successfully' })
  @ApiResponse({ status: 404, description: 'Inbound connector not found' })
  async update(
    @Param('orgId') orgId: string, 
    @Param('id') id: string, 
    @Body() inbound: Partial<Omit<InboundDTO, 'id' | 'organizationId'>>
  ) {
    return this.inbounds.update(orgId, id, inbound);
  }

  @Post(':orgId/:id/publish')
  @ApiOperation({ summary: 'Publish inbound connector to FreeSWITCH engine' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inbound connector ID' })
  @ApiResponse({ status: 200, description: 'Inbound connector published successfully' })
  @ApiResponse({ status: 404, description: 'Inbound connector not found' })
  @ApiResponse({ status: 500, description: 'Engine publication failed' })
  async publish(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.inbounds.publish(orgId, id);
  }

  @Post(':orgId/:id/test')
  @ApiOperation({ summary: 'Test inbound connector routing' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inbound connector ID' })
  @ApiResponse({ status: 200, description: 'Inbound connector test results' })
  async test(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.inbounds.testRouting(orgId, id);
  }

  @Delete(':orgId/:id')
  @ApiOperation({ summary: 'Delete inbound connector' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Inbound connector ID' })
  @ApiResponse({ status: 200, description: 'Inbound connector deleted successfully' })
  @ApiResponse({ status: 404, description: 'Inbound connector not found' })
  async remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.inbounds.remove(orgId, id);
  }
}

