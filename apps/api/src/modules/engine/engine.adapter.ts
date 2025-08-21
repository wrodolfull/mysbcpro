import type { FlowDTO, InboundDTO, TrunkDTO } from '@mysbc/shared';

export interface TenantConfig {
  tenantId: string;
  organizationId: string;
  organizationName: string;
  sipPort: number;
  apiPassword: string;
}

export interface EngineAdapter {
  // Tenant management
  createTenant(config: TenantConfig): Promise<void>;
  removeTenant(tenantId: string): Promise<void>;

  // Trunk management
  upsertTrunk(orgId: string, trunk: TrunkDTO): Promise<void>;
  removeTrunk(orgId: string, trunkId: string): Promise<void>;
  
  // Inbound management
  upsertInbound(orgId: string, inbound: InboundDTO): Promise<void>;
  removeInbound(orgId: string, inboundId: string): Promise<void>;

  // Flow management
  publishFlow(orgId: string, flow: FlowDTO): Promise<{ engineRef: string }>;
  removeFlow(orgId: string, flowId: string): Promise<void>;
  rollbackFlow(orgId: string, flowId: string, toVersion: number): Promise<void>;

  // Call control
  playAndGetDigits(cfg: {
    orgId: string;
    promptFile: string; minDigits: number; maxDigits: number; timeoutMs: number; tries: number; regex?: string;
    onResultVar: string;
  }): Promise<void>;

  recordCall(orgId: string, action: 'start' | 'stop', fileName: string): Promise<void>;

  // System management
  reload(): Promise<void>;
  health(): Promise<{ ok: boolean; details?: any }>;
  testGateway(gatewayName: string): Promise<{ ok: boolean; details?: any }>;
}

