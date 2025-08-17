import { Inject, Injectable } from '@nestjs/common';
import type { EngineAdapter, TenantConfig } from './engine.adapter';
import type { FlowDTO, InboundDTO, TrunkDTO } from '@mysbc/shared';

@Injectable()
export class EngineService {
  constructor(@Inject('ENGINE_ADAPTER') private readonly adapter: EngineAdapter) {}

  // Tenant management
  createTenant(config: TenantConfig) {
    return this.adapter.createTenant(config);
  }
  removeTenant(tenantId: string) {
    return this.adapter.removeTenant(tenantId);
  }

  // Trunk management
  upsertTrunk(orgId: string, trunk: TrunkDTO) {
    return this.adapter.upsertTrunk(orgId, trunk);
  }
  removeTrunk(orgId: string, trunkId: string) {
    return this.adapter.removeTrunk(orgId, trunkId);
  }
  
  // Inbound management
  upsertInbound(orgId: string, inbound: InboundDTO) {
    return this.adapter.upsertInbound(orgId, inbound);
  }
  removeInbound(orgId: string, inboundId: string) {
    return this.adapter.removeInbound(orgId, inboundId);
  }
  
  // Flow management
  publishFlow(orgId: string, flow: FlowDTO) {
    return this.adapter.publishFlow(orgId, flow);
  }
  rollbackFlow(orgId: string, flowId: string, toVersion: number) {
    return this.adapter.rollbackFlow(orgId, flowId, toVersion);
  }
  
  // System management
  reload() {
    return this.adapter.reload();
  }
  health() {
    return this.adapter.health();
  }
  testGateway(gatewayName: string) {
    return this.adapter.testGateway(gatewayName);
  }
}

