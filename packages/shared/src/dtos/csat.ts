export type CsatChannel = 'ivr' | 'link';
export type CsatScoreType = 'nps' | 'stars';

export interface CsatSurveyDTO {
  id?: string;
  organizationId: string;
  name: string;
  scoreTypes: CsatScoreType[]; // one or both
  publicLinkSlug: string;
  enabled: boolean;
}

export interface CsatQuestionDTO {
  id?: string;
  organizationId: string;
  surveyId: string;
  text: string;
  order: number;
}

export interface CsatResponseDTO {
  id?: string;
  organizationId: string;
  surveyId: string;
  questionId: string;
  traceId: string;
  channel: CsatChannel;
  scoreType: CsatScoreType;
  score: number;
  comment?: string;
  createdAt?: string;
}

