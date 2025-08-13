import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { CsatQuestionDTO, CsatResponseDTO, CsatSurveyDTO } from '@mysbc/shared';

@Controller('csat')
export class CsatController {
  private readonly surveys = new Map<string, CsatSurveyDTO & { questions: CsatQuestionDTO[] }>();
  private readonly responses: CsatResponseDTO[] = [];

  @Post(':orgId/surveys')
  upsert(@Param('orgId') orgId: string, @Body() survey: CsatSurveyDTO & { questions?: CsatQuestionDTO[] }) {
    const id = survey.id ?? crypto.randomUUID();
    const s = { ...survey, id, organizationId: orgId, questions: survey.questions ?? [] };
    this.surveys.set(`${orgId}:${id}`, s);
    return s;
  }

  @Get(':orgId/surveys')
  list(@Param('orgId') orgId: string) {
    return Array.from(this.surveys.values()).filter(s => s.organizationId === orgId);
  }

  @Post(':orgId/surveys/:surveyId/response')
  respond(@Param('orgId') orgId: string, @Param('surveyId') surveyId: string, @Body() resp: CsatResponseDTO) {
    const r = { ...resp, id: crypto.randomUUID(), organizationId: orgId, surveyId };
    this.responses.push(r);
    return { ok: true };
  }

  @Get(':orgId/analytics/:surveyId')
  analytics(@Param('orgId') orgId: string, @Param('surveyId') surveyId: string) {
    const rs = this.responses.filter(r => r.organizationId === orgId && r.surveyId === surveyId);
    const avg = rs.length ? rs.reduce((a, b) => a + b.score, 0) / rs.length : 0;
    return { count: rs.length, avg };
  }
}

