import { Inject, Injectable } from '@nestjs/common';
import type { EngineAdapter } from './engine.adapter';
import type { FlowDTO, InboundDTO, TrunkDTO } from '@mysbc/shared';

@Injectable()
export class EngineService {
  constructor(@Inject('ENGINE_ADAPTER') private readonly adapter: EngineAdapter) {}

  upsertTrunk(orgId: string, trunk: TrunkDTO) {
    return this.adapter.upsertTrunk(orgId, trunk);
  }
  removeTrunk(orgId: string, trunkId: string) {
    return this.adapter.removeTrunk(orgId, trunkId);
  }
  upsertInbound(orgId: string, inbound: InboundDTO) {
    return this.adapter.upsertInbound(orgId, inbound);
  }
  removeInbound(orgId: string, inboundId: string) {
    return this.adapter.removeInbound(orgId, inboundId);
  }
  publishFlow(orgId: string, flow: FlowDTO) {
    return this.adapter.publishFlow(orgId, flow);
  }
  rollbackFlow(orgId: string, flowId: string, toVersion: number) {
    return this.adapter.rollbackFlow(orgId, flowId, toVersion);
  }
  reload() {
    return this.adapter.reload();
  }
  health() {
    return this.adapter.health();
  }
}

