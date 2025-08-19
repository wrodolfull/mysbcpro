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
  | 'survey_csat'
  // Tipos de nós FreeSWITCH
  | 'answer'
  | 'set_defaults'
  | 'collect_digits'
  | 'sanitize_digits'
  | 'validate_with_script'
  | 'feedback_while_validating'
  | 'branch_by_status'
  | 'route_result'
  | 'offer_fallback'
  | 'transfer'
  | 'bridge'
  | 'callcenter'
  | 'hangup';

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

