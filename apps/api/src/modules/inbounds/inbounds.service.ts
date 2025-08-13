import { Injectable } from '@nestjs/common';
import type { InboundDTO } from '@mysbc/shared';
import { SupabaseService } from '../../supabase/supabase.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class InboundsService {
  constructor(private readonly supa: SupabaseService, private readonly engine: EngineService) {}

  async list(orgId: string) {
    const { data, error } = await this.supa.getAdmin()
      .from('inbounds')
      .select('*')
      .eq('organization_id', orgId);
    if (error) throw error;
    return data as any as InboundDTO[];
  }

  async upsert(inbound: InboundDTO) {
    const payload = {
      organization_id: inbound.organizationId,
      name: inbound.name,
      did_or_uri: inbound.didOrUri,
      caller_id_number: inbound.callerIdNumber ?? null,
      network_addr: inbound.networkAddr ?? null,
      context: inbound.context,
      priority: inbound.priority,
      match_rules: inbound.matchRules ?? null,
      target_flow_id: inbound.targetFlowId ?? null,
      enabled: inbound.enabled
    };
    const { data, error } = await this.supa.getAdmin().from('inbounds').upsert({ id: inbound.id, ...payload }).select();
    if (error) throw error;
    const saved = (data?.[0] ?? {}) as any;
    await this.engine.upsertInbound(inbound.organizationId, inbound);
    return { ...inbound, id: saved.id ?? inbound.id } as InboundDTO;
  }

  async remove(orgId: string, id: string) {
    const { error } = await this.supa.getAdmin().from('inbounds').delete().eq('id', id).eq('organization_id', orgId);
    if (error) throw error;
    await this.engine.removeInbound(orgId, id);
    return { ok: true };
  }
}

