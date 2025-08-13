export type FlowNodeType =
  | 'start'
  | 'end'
  | 'play_audio'
  | 'tts'
  | 'ivr_capture'
  | 'business_hours'
  | 'record_call'
  | 'asr_stt'
  | 'crm_condition'
  | 'http_request'
  | 'forward'
  | 'queue'
  | 'voicemail'
  | 'survey_csat';

export interface FlowNodeBase<TType extends FlowNodeType = FlowNodeType> {
  id: string;
  type: TType;
  name?: string;
  data?: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  condition?: Record<string, unknown> | null;
}

export interface FlowGraphDTO {
  nodes: FlowNodeBase[];
  edges: FlowEdge[];
}

export type FlowStatus = 'draft' | 'published';

export interface FlowDTO {
  id?: string;
  organizationId: string;
  name: string;
  status: FlowStatus;
  version: number;
  graph: FlowGraphDTO;
}

