import type { FlowDTO, InboundDTO, TrunkDTO } from '@mysbc/shared';

export interface EngineAdapter {
  upsertTrunk(orgId: string, trunk: TrunkDTO): Promise<void>;
  removeTrunk(orgId: string, trunkId: string): Promise<void>;
  upsertInbound(orgId: string, inbound: InboundDTO): Promise<void>;
  removeInbound(orgId: string, inboundId: string): Promise<void>;

  publishFlow(orgId: string, flow: FlowDTO): Promise<{ engineRef: string }>;
  rollbackFlow(orgId: string, flowId: string, toVersion: number): Promise<void>;

  playAndGetDigits(cfg: {
    orgId: string;
    promptFile: string; minDigits: number; maxDigits: number; timeoutMs: number; tries: number; regex?: string;
    onResultVar: string;
  }): Promise<void>;

  recordCall(orgId: string, action: 'start' | 'stop', fileName: string): Promise<void>;

  reload(): Promise<void>;
  health(): Promise<{ ok: boolean; details?: any }>;
}

