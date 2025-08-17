import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { TrunkDTO } from '@mysbc/shared';
import { TrunksService } from './trunks.service';

@ApiTags('Trunks')
@Controller('trunks')
export class TrunksController {
  constructor(private readonly trunks: TrunksService) {}

  @Get(':orgId')
  @ApiOperation({ summary: 'List all trunks for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'enabled', required: false, description: 'Filter by enabled status' })
  @ApiResponse({ status: 200, description: 'List of trunks' })
  async list(
    @Param('orgId') orgId: string,
    @Query('enabled') enabled?: string
  ) {
    return this.trunks.list(orgId, enabled === 'true' ? true : enabled === 'false' ? false : undefined);
  }

  @Get(':orgId/:id')
  @ApiOperation({ summary: 'Get trunk by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Trunk ID' })
  @ApiResponse({ status: 200, description: 'Trunk details' })
  @ApiResponse({ status: 404, description: 'Trunk not found' })
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.trunks.findOne(orgId, id);
  }

  @Post(':orgId')
  @ApiOperation({ summary: 'Create new trunk' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiBody({ description: 'Trunk data' })
  @ApiResponse({ status: 201, description: 'Trunk created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid trunk data' })
  async create(@Param('orgId') orgId: string, @Body() trunk: Omit<TrunkDTO, 'id' | 'organizationId'>) {
    return this.trunks.create({ ...trunk, organizationId: orgId });
  }

  @Put(':orgId/:id')
  @ApiOperation({ summary: 'Update existing trunk' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Trunk ID' })
  @ApiBody({ description: 'Updated trunk data' })
  @ApiResponse({ status: 200, description: 'Trunk updated successfully' })
  @ApiResponse({ status: 404, description: 'Trunk not found' })
  async update(
    @Param('orgId') orgId: string, 
    @Param('id') id: string, 
    @Body() trunk: Partial<Omit<TrunkDTO, 'id' | 'organizationId'>>
  ) {
    return this.trunks.update(orgId, id, trunk);
  }

  @Post(':orgId/:id/publish')
  @ApiOperation({ summary: 'Publish trunk to FreeSWITCH engine' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Trunk ID' })
  @ApiResponse({ status: 200, description: 'Trunk published successfully' })
  @ApiResponse({ status: 404, description: 'Trunk not found' })
  @ApiResponse({ status: 500, description: 'Engine publication failed' })
  async publish(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.trunks.publish(orgId, id);
  }

  @Post(':orgId/:id/test')
  @ApiOperation({ summary: 'Test trunk connectivity' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Trunk ID' })
  @ApiResponse({ status: 200, description: 'Trunk test results' })
  async test(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.trunks.testConnectivity(orgId, id);
  }

  @Delete(':orgId/:id')
  @ApiOperation({ summary: 'Delete trunk' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Trunk ID' })
  @ApiResponse({ status: 200, description: 'Trunk deleted successfully' })
  @ApiResponse({ status: 404, description: 'Trunk not found' })
  async remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.trunks.remove(orgId, id);
  }
}

