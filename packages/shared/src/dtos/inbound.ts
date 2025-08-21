export type InboundContext = 'public' | 'default';

export interface InboundDTO {
  id?: string;
  organizationId: string;
  name: string;
  didOrUri: string;
  callerIdNumber?: string;
  networkAddr?: string;
  context: InboundContext;
  priority: number;
  matchRules?: Record<string, unknown> | null; // JSON rules
  targetFlowId?: string | null; // published flow id
  enabled: boolean;
  publishedAt?: string; // ISO timestamp when last published to engine
}

