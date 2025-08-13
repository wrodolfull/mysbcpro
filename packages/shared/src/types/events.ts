export interface EventRecord {
  id?: string;
  organizationId: string;
  traceId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt?: string;
}

export interface ExecutionRecord {
  id?: string;
  organizationId: string;
  traceId: string;
  flowId?: string | null;
  nodeId?: string | null;
  status: 'started' | 'success' | 'error';
  details?: Record<string, unknown>;
  createdAt?: string;
}

