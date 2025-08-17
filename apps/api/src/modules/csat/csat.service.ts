import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { CsatQuestionDTO, CsatResponseDTO, CsatSurveyDTO } from '@mysbc/shared';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class CsatService {
  private readonly logger = new Logger(CsatService.name);

  constructor(private readonly supa: SupabaseService) {}

  async listSurveys(orgId: string, enabled?: boolean): Promise<CsatSurveyDTO[]> {
    try {
      this.logger.log(`Listing CSAT surveys for org ${orgId}, enabled filter: ${enabled}`);
      
      let query = this.supa.getAdmin()
        .from('csat_surveys')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (enabled !== undefined) {
        query = query.eq('enabled', enabled);
      }

      const { data, error } = await query;
      
      if (error) {
        this.logger.error('Failed to list CSAT surveys', error);
        throw error;
      }

      return data?.map(this.mapSurveyFromDB) || [];
    } catch (err) {
      this.logger.error('Error in CsatService.listSurveys:', err);
      throw err;
    }
  }

  async findSurvey(orgId: string, id: string): Promise<CsatSurveyDTO & { questions: CsatQuestionDTO[] }> {
    this.logger.log(`Finding CSAT survey ${id} for org ${orgId}`);

    // Get survey
    const { data: survey, error: surveyError } = await this.supa.getAdmin()
      .from('csat_surveys')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (surveyError) {
      if (surveyError.code === 'PGRST116') {
        throw new NotFoundException(`CSAT survey ${id} not found`);
      }
      this.logger.error('Failed to find CSAT survey', surveyError);
      throw surveyError;
    }

    // Get questions
    const { data: questions, error: questionsError } = await this.supa.getAdmin()
      .from('csat_questions')
      .select('*')
      .eq('survey_id', id)
      .eq('organization_id', orgId)
      .order('order', { ascending: true });

    if (questionsError) {
      this.logger.error('Failed to get survey questions', questionsError);
      throw questionsError;
    }

    return {
      ...this.mapSurveyFromDB(survey),
      questions: questions?.map(this.mapQuestionFromDB) || []
    };
  }

  async createSurvey(survey: Omit<CsatSurveyDTO, 'id'> & { questions: Omit<CsatQuestionDTO, 'id' | 'surveyId' | 'organizationId'>[] }): Promise<CsatSurveyDTO & { questions: CsatQuestionDTO[] }> {
    this.logger.log(`Creating CSAT survey ${survey.name} for org ${survey.organizationId}`);

    if (!survey.name) {
      throw new BadRequestException('Survey name is required');
    }

    if (!survey.questions || survey.questions.length === 0) {
      throw new BadRequestException('Survey must have at least one question');
    }

    try {
      // Create survey
      const surveyPayload = this.mapSurveyToDB(survey);
      const { data: createdSurvey, error: surveyError } = await this.supa.getAdmin()
        .from('csat_surveys')
        .insert(surveyPayload)
        .select()
        .single();

      if (surveyError) {
        this.logger.error('Failed to create CSAT survey', surveyError);
        throw surveyError;
      }

      // Create questions
      const questionsPayload = survey.questions.map((q, index) => ({
        organization_id: survey.organizationId,
        survey_id: createdSurvey.id,
        text: q.text,
        order: index + 1
      }));

      const { data: createdQuestions, error: questionsError } = await this.supa.getAdmin()
        .from('csat_questions')
        .insert(questionsPayload)
        .select();

      if (questionsError) {
        // Rollback survey creation
        await this.supa.getAdmin()
          .from('csat_surveys')
          .delete()
          .eq('id', createdSurvey.id);
        
        this.logger.error('Failed to create survey questions', questionsError);
        throw questionsError;
      }

      const result = {
        ...this.mapSurveyFromDB(createdSurvey),
        questions: createdQuestions?.map(this.mapQuestionFromDB) || []
      };

      this.logger.log(`CSAT survey ${result.id} created successfully with ${result.questions.length} questions`);
      return result;
    } catch (error) {
      this.logger.error('Failed to create CSAT survey', error);
      throw error;
    }
  }

  async updateSurvey(orgId: string, id: string, updates: Partial<Omit<CsatSurveyDTO, 'id' | 'organizationId'>>): Promise<CsatSurveyDTO> {
    this.logger.log(`Updating CSAT survey ${id} for org ${orgId}`);

    // Check if survey exists
    await this.findSurvey(orgId, id);

    const payload = this.mapSurveyToDB({ ...updates, organizationId: orgId });
    delete payload.organization_id; // Don't update orgId

    const { data, error } = await this.supa.getAdmin()
      .from('csat_surveys')
      .update(payload)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update CSAT survey', error);
      throw error;
    }

    const updated = this.mapSurveyFromDB(data);
    this.logger.log(`CSAT survey ${id} updated successfully`);
    
    return updated;
  }

  async deleteSurvey(orgId: string, id: string): Promise<{ ok: boolean }> {
    this.logger.log(`Deleting CSAT survey ${id} for org ${orgId}`);

    // Check if survey exists
    await this.findSurvey(orgId, id);
    
    try {
      // Delete survey (questions will be deleted by cascade)
      const { error } = await this.supa.getAdmin()
        .from('csat_surveys')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        this.logger.error('Failed to delete CSAT survey', error);
        throw error;
      }

      this.logger.log(`CSAT survey ${id} deleted successfully`);
      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to delete CSAT survey ${id}`, error);
      throw error;
    }
  }

  async getPublicSurvey(slug: string): Promise<CsatSurveyDTO & { questions: CsatQuestionDTO[] }> {
    this.logger.log(`Getting public CSAT survey by slug: ${slug}`);

    // Get survey by public link slug
    const { data: survey, error: surveyError } = await this.supa.getAdmin()
      .from('csat_surveys')
      .select('*')
      .eq('public_link_slug', slug)
      .eq('enabled', true)
      .single();

    if (surveyError) {
      if (surveyError.code === 'PGRST116') {
        throw new NotFoundException(`Public survey not found or disabled`);
      }
      this.logger.error('Failed to find public survey', surveyError);
      throw surveyError;
    }

    // Get questions
    const { data: questions, error: questionsError } = await this.supa.getAdmin()
      .from('csat_questions')
      .select('*')
      .eq('survey_id', survey.id)
      .order('order', { ascending: true });

    if (questionsError) {
      this.logger.error('Failed to get public survey questions', questionsError);
      throw questionsError;
    }

    return {
      ...this.mapSurveyFromDB(survey),
      questions: questions?.map(this.mapQuestionFromDB) || []
    };
  }

  async submitResponse(orgId: string, surveyId: string, response: Omit<CsatResponseDTO, 'id' | 'organizationId' | 'surveyId'>): Promise<{ ok: boolean; id: string }> {
    this.logger.log(`Submitting CSAT response for survey ${surveyId} in org ${orgId}`);

    // Verify survey exists
    await this.findSurvey(orgId, surveyId);

    const payload = {
      organization_id: orgId,
      survey_id: surveyId,
      question_id: response.questionId,
      trace_id: response.traceId,
      channel: response.channel,
      score_type: response.scoreType,
      score: response.score,
      comment: response.comment
    };

    const { data, error } = await this.supa.getAdmin()
      .from('csat_responses')
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to submit CSAT response', error);
      throw error;
    }

    this.logger.log(`CSAT response submitted successfully: ${data.id}`);
    return { ok: true, id: data.id };
  }

  async submitPublicResponse(slug: string, response: Omit<CsatResponseDTO, 'id' | 'organizationId' | 'surveyId'>): Promise<{ ok: boolean; id: string }> {
    this.logger.log(`Submitting public CSAT response for survey slug: ${slug}`);

    // Get survey by slug
    const survey = await this.getPublicSurvey(slug);

    return this.submitResponse(survey.organizationId, survey.id!, response);
  }

  async getResponses(orgId: string, surveyId: string, limit: number = 50, offset: number = 0): Promise<{ responses: CsatResponseDTO[]; total: number }> {
    this.logger.log(`Getting responses for survey ${surveyId} in org ${orgId}`);

    const { data, error, count } = await this.supa.getAdmin()
      .from('csat_responses')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to get CSAT responses', error);
      throw error;
    }

    return {
      responses: data?.map(this.mapResponseFromDB) || [],
      total: count || 0
    };
  }

  async getAnalytics(orgId: string, surveyId: string, period?: string): Promise<any> {
    this.logger.log(`Getting analytics for survey ${surveyId} in org ${orgId}, period: ${period}`);

    // Calculate date filter based on period
    let dateFilter = '';
    if (period) {
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[period as keyof typeof daysMap] || 30;
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      dateFilter = fromDate.toISOString();
    }

    // Build query
    let query = this.supa.getAdmin()
      .from('csat_responses')
      .select('score, score_type, created_at')
      .eq('organization_id', orgId)
      .eq('survey_id', surveyId);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to get CSAT analytics', error);
      throw error;
    }

    const responses = data || [];

    // Calculate analytics
    const totalResponses = responses.length;
    const npsResponses = responses.filter(r => r.score_type === 'nps');
    const starsResponses = responses.filter(r => r.score_type === 'stars');

    // NPS calculation (0-6 detractors, 7-8 passive, 9-10 promoters)
    const npsStats = {
      total: npsResponses.length,
      detractors: npsResponses.filter(r => r.score <= 6).length,
      passive: npsResponses.filter(r => r.score >= 7 && r.score <= 8).length,
      promoters: npsResponses.filter(r => r.score >= 9).length,
      score: 0
    };

    if (npsStats.total > 0) {
      npsStats.score = Math.round(((npsStats.promoters - npsStats.detractors) / npsStats.total) * 100);
    }

    // Stars average
    const starsAverage = starsResponses.length > 0 
      ? starsResponses.reduce((sum, r) => sum + r.score, 0) / starsResponses.length 
      : 0;

    // Distribution by score
    const distribution: Record<string, number> = {};
    responses.forEach(r => {
      const key = `${r.score_type}_${r.score}`;
      distribution[key] = (distribution[key] || 0) + 1;
    });

    return {
      totalResponses,
      nps: npsStats,
      starsAverage: Math.round(starsAverage * 10) / 10,
      distribution,
      period: period || 'all'
    };
  }

  async exportResponses(orgId: string, surveyId: string, format: string): Promise<any> {
    this.logger.log(`Exporting responses for survey ${surveyId} in org ${orgId}, format: ${format}`);

    const { responses } = await this.getResponses(orgId, surveyId, 10000, 0); // Get all

    if (format === 'csv') {
      // Generate CSV data
      const headers = ['Date', 'Trace ID', 'Channel', 'Score Type', 'Score', 'Comment'];
      const csvData = responses.map(r => [
        r.createdAt,
        r.traceId,
        r.channel,
        r.scoreType,
        r.score,
        r.comment || ''
      ]);

      return {
        format: 'csv',
        headers,
        data: csvData,
        totalRows: responses.length
      };
    }

    // Detailed format
    return {
      format: 'detailed',
      responses,
      summary: await this.getAnalytics(orgId, surveyId),
      exportedAt: new Date().toISOString()
    };
  }

  async getDashboard(orgId: string, period?: string): Promise<any> {
    this.logger.log(`Getting CSAT dashboard for org ${orgId}, period: ${period}`);

    // Get all surveys for the org
    const surveys = await this.listSurveys(orgId, true); // Only enabled

    // Get analytics for each survey
    const surveyAnalytics = await Promise.all(
      surveys.map(async (survey) => ({
        survey: survey,
        analytics: await this.getAnalytics(orgId, survey.id!, period)
      }))
    );

    // Calculate overall metrics
    const totalResponses = surveyAnalytics.reduce((sum, s) => sum + s.analytics.totalResponses, 0);
    const averageNPS = surveyAnalytics.length > 0
      ? surveyAnalytics.reduce((sum, s) => sum + (s.analytics.nps.score || 0), 0) / surveyAnalytics.length
      : 0;
    const averageStars = surveyAnalytics.length > 0
      ? surveyAnalytics.reduce((sum, s) => sum + (s.analytics.starsAverage || 0), 0) / surveyAnalytics.length
      : 0;

    return {
      overview: {
        totalSurveys: surveys.length,
        totalResponses,
        averageNPS: Math.round(averageNPS),
        averageStars: Math.round(averageStars * 10) / 10
      },
      surveys: surveyAnalytics,
      period: period || 'all'
    };
  }

  private mapSurveyFromDB(data: any): CsatSurveyDTO {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      scoreTypes: data.score_types,
      publicLinkSlug: data.public_link_slug,
      enabled: data.enabled
    };
  }

  private mapSurveyToDB(dto: Partial<CsatSurveyDTO>): any {
    return {
      organization_id: dto.organizationId,
      name: dto.name,
      score_types: dto.scoreTypes || ['nps'],
      public_link_slug: dto.publicLinkSlug || this.generateSlug(),
      enabled: dto.enabled ?? true
    };
  }

  private mapQuestionFromDB(data: any): CsatQuestionDTO {
    return {
      id: data.id,
      organizationId: data.organization_id,
      surveyId: data.survey_id,
      text: data.text,
      order: data.order
    };
  }

  private mapResponseFromDB(data: any): CsatResponseDTO {
    return {
      id: data.id,
      organizationId: data.organization_id,
      surveyId: data.survey_id,
      questionId: data.question_id,
      traceId: data.trace_id,
      channel: data.channel,
      scoreType: data.score_type,
      score: data.score,
      comment: data.comment,
      createdAt: data.created_at
    };
  }

  private generateSlug(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
