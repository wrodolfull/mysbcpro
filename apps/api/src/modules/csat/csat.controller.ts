import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import type { CsatQuestionDTO, CsatResponseDTO, CsatSurveyDTO } from '@mysbc/shared';
import { CsatService } from './csat.service';

@ApiTags('CSAT')
@Controller('csat')
export class CsatController {
  constructor(private readonly csat: CsatService) {}

  // Surveys CRUD
  @Get(':orgId/surveys')
  @ApiOperation({ summary: 'List all CSAT surveys for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'enabled', required: false, description: 'Filter by enabled status' })
  @ApiResponse({ status: 200, description: 'List of CSAT surveys' })
  async listSurveys(
    @Param('orgId') orgId: string,
    @Query('enabled') enabled?: string
  ) {
    return this.csat.listSurveys(orgId, enabled === 'true' ? true : enabled === 'false' ? false : undefined);
  }

  @Get(':orgId/surveys/:id')
  @ApiOperation({ summary: 'Get CSAT survey by ID' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiResponse({ status: 200, description: 'Survey details with questions' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  async findSurvey(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.csat.findSurvey(orgId, id);
  }

  @Post(':orgId/surveys')
  @ApiOperation({ summary: 'Create new CSAT survey' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiBody({ description: 'Survey data with questions' })
  @ApiResponse({ status: 201, description: 'Survey created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid survey data' })
  async createSurvey(
    @Param('orgId') orgId: string, 
    @Body() survey: Omit<CsatSurveyDTO, 'id' | 'organizationId'> & { questions: Omit<CsatQuestionDTO, 'id' | 'surveyId' | 'organizationId'>[] }
  ) {
    return this.csat.createSurvey({ ...survey, organizationId: orgId });
  }

  @Put(':orgId/surveys/:id')
  @ApiOperation({ summary: 'Update existing CSAT survey' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiBody({ description: 'Updated survey data' })
  @ApiResponse({ status: 200, description: 'Survey updated successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  async updateSurvey(
    @Param('orgId') orgId: string, 
    @Param('id') id: string, 
    @Body() survey: Partial<Omit<CsatSurveyDTO, 'id' | 'organizationId'>>
  ) {
    return this.csat.updateSurvey(orgId, id, survey);
  }

  @Delete(':orgId/surveys/:id')
  @ApiOperation({ summary: 'Delete CSAT survey' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'Survey ID' })
  @ApiResponse({ status: 200, description: 'Survey deleted successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  async deleteSurvey(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.csat.deleteSurvey(orgId, id);
  }

  // Public survey link
  @Get('public/:slug')
  @ApiOperation({ summary: 'Get public survey by slug' })
  @ApiParam({ name: 'slug', description: 'Public survey slug' })
  @ApiResponse({ status: 200, description: 'Public survey details' })
  @ApiResponse({ status: 404, description: 'Survey not found or disabled' })
  async getPublicSurvey(@Param('slug') slug: string) {
    return this.csat.getPublicSurvey(slug);
  }

  // Responses
  @Post(':orgId/surveys/:surveyId/responses')
  @ApiOperation({ summary: 'Submit CSAT response (authenticated)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'surveyId', description: 'Survey ID' })
  @ApiBody({ description: 'Response data' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  async submitResponse(
    @Param('orgId') orgId: string, 
    @Param('surveyId') surveyId: string, 
    @Body() response: Omit<CsatResponseDTO, 'id' | 'organizationId' | 'surveyId'>
  ) {
    return this.csat.submitResponse(orgId, surveyId, response);
  }

  @Post('public/:slug/responses')
  @ApiOperation({ summary: 'Submit CSAT response (public)' })
  @ApiParam({ name: 'slug', description: 'Public survey slug' })
  @ApiBody({ description: 'Response data' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  async submitPublicResponse(
    @Param('slug') slug: string, 
    @Body() response: Omit<CsatResponseDTO, 'id' | 'organizationId' | 'surveyId'>
  ) {
    return this.csat.submitPublicResponse(slug, response);
  }

  @Get(':orgId/surveys/:surveyId/responses')
  @ApiOperation({ summary: 'Get survey responses' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'surveyId', description: 'Survey ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  @ApiResponse({ status: 200, description: 'Survey responses' })
  async getResponses(
    @Param('orgId') orgId: string, 
    @Param('surveyId') surveyId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.csat.getResponses(orgId, surveyId, Number(limit) || 50, Number(offset) || 0);
  }

  // Analytics & Reports
  @Get(':orgId/surveys/:surveyId/analytics')
  @ApiOperation({ summary: 'Get survey analytics' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'surveyId', description: 'Survey ID' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (7d, 30d, 90d)' })
  @ApiResponse({ status: 200, description: 'Survey analytics data' })
  async getAnalytics(
    @Param('orgId') orgId: string, 
    @Param('surveyId') surveyId: string,
    @Query('period') period?: string
  ) {
    return this.csat.getAnalytics(orgId, surveyId, period);
  }

  @Get(':orgId/surveys/:surveyId/export')
  @ApiOperation({ summary: 'Export survey responses to CSV' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'surveyId', description: 'Survey ID' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format (csv, detailed)' })
  @ApiResponse({ status: 200, description: 'Exported data' })
  async exportResponses(
    @Param('orgId') orgId: string, 
    @Param('surveyId') surveyId: string,
    @Query('format') format?: string
  ) {
    return this.csat.exportResponses(orgId, surveyId, format || 'csv');
  }

  @Get(':orgId/dashboard')
  @ApiOperation({ summary: 'Get CSAT dashboard data' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (7d, 30d, 90d)' })
  @ApiResponse({ status: 200, description: 'Dashboard analytics' })
  async getDashboard(
    @Param('orgId') orgId: string,
    @Query('period') period?: string
  ) {
    return this.csat.getDashboard(orgId, period);
  }
}

