import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { FlowDTO } from '@mysbc/shared';
import { FlowsService } from './flows.service';

@ApiTags('Flows')
@Controller('flows')
export class FlowsController {
  constructor(private readonly flows: FlowsService) {}

  @Get(':orgId')
  @ApiOperation({ summary: 'List all flows for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (draft/published)' })
  @ApiResponse({ status: 200, description: 'List of flows' })
  async list(
    @Param('orgId') orgId: string,
    @Query('status') status?: string
  ) {
    return this.flows.list(orgId, status as any);
  }

  @Get(':orgId/:id')
  @ApiOperation({ summary: 'Get flow by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiResponse({ status: 200, description: 'Flow details' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.flows.findOne(orgId, id);
  }

  @Post(':orgId')
  @ApiOperation({ summary: 'Create new flow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiBody({ description: 'Flow data' })
  @ApiResponse({ status: 201, description: 'Flow created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid flow data' })
  async create(@Param('orgId') orgId: string, @Body() flow: Omit<FlowDTO, 'id' | 'organizationId'>) {
    return this.flows.create({ ...flow, organizationId: orgId });
  }

  @Put(':orgId/:id')
  @ApiOperation({ summary: 'Update existing flow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiBody({ description: 'Updated flow data' })
  @ApiResponse({ status: 200, description: 'Flow updated successfully' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  async update(
    @Param('orgId') orgId: string, 
    @Param('id') id: string, 
    @Body() flow: Partial<Omit<FlowDTO, 'id' | 'organizationId'>>
  ) {
    return this.flows.update(orgId, id, flow);
  }

  @Post(':orgId/:id/validate')
  @ApiOperation({ summary: 'Validate flow graph and nodes' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiResponse({ status: 200, description: 'Flow validation results' })
  @ApiResponse({ status: 400, description: 'Flow validation failed' })
  async validate(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.flows.validateById(orgId, id);
  }

  @Post(':orgId/validate')
  @ApiOperation({ summary: 'Validate flow graph (without saving)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiBody({ description: 'Flow data to validate' })
  @ApiResponse({ status: 200, description: 'Flow validation results' })
  @ApiResponse({ status: 400, description: 'Flow validation failed' })
  async validateDraft(@Param('orgId') orgId: string, @Body() flow: FlowDTO) {
    return this.flows.validate(flow, orgId);
  }

  @Post(':orgId/:id/publish')
  @ApiOperation({ summary: 'Publish flow to FreeSWITCH engine' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiBody({ description: 'Updated flow data to publish' })
  @ApiResponse({ status: 200, description: 'Flow published successfully' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  @ApiResponse({ status: 400, description: 'Flow validation failed' })
  @ApiResponse({ status: 500, description: 'Engine publication failed' })
  async publish(@Param('orgId') orgId: string, @Param('id') id: string, @Body() updatedFlow?: any) {
    return this.flows.publish(orgId, id, updatedFlow);
  }

  @Post(':orgId/:id/unpublish')
  @ApiOperation({ summary: 'Unpublish flow (change to draft status)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiResponse({ status: 200, description: 'Flow unpublished successfully' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  @ApiResponse({ status: 400, description: 'Flow is not published' })
  async unpublish(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.flows.unpublish(orgId, id);
  }

  @Post(':orgId/:id/rollback/:toVersion')
  @ApiOperation({ summary: 'Rollback flow to previous version' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiParam({ name: 'toVersion', description: 'Target version number' })
  @ApiResponse({ status: 200, description: 'Flow rolled back successfully' })
  @ApiResponse({ status: 404, description: 'Flow or version not found' })
  async rollback(
    @Param('orgId') orgId: string,
    @Param('id') flowId: string,
    @Param('toVersion') toVersion: string
  ) {
    return this.flows.rollback(orgId, flowId, Number(toVersion));
  }

  @Get(':orgId/:id/versions')
  @ApiOperation({ summary: 'Get all versions of a flow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiResponse({ status: 200, description: 'List of flow versions' })
  async getVersions(@Param('orgId') orgId: string, @Param('id') flowId: string) {
    return this.flows.getVersions(orgId, flowId);
  }

  @Get(':orgId/:id/executions')
  @ApiOperation({ summary: 'Get flow execution history' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiResponse({ status: 200, description: 'Flow execution history' })
  async getExecutions(
    @Param('orgId') orgId: string, 
    @Param('id') flowId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.flows.getExecutions(orgId, flowId, Number(limit) || 50, Number(offset) || 0);
  }

  @Delete(':orgId/:id')
  @ApiOperation({ summary: 'Delete flow' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Flow ID' })
  @ApiResponse({ status: 200, description: 'Flow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Flow not found' })
  @ApiResponse({ status: 409, description: 'Cannot delete published flow' })
  async remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.flows.remove(orgId, id);
  }
}

