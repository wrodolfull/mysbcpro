import { Injectable } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';
import type { FlowDTO } from '@mysbc/shared';
import { createDefaultRegistry } from '@mysbc/flow-nodes';
import { validateGraphConnectivity } from '@mysbc/flow-nodes';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class FlowsService {
  private readonly registry = createDefaultRegistry();

  constructor(private readonly engine: EngineService, private readonly supa: SupabaseService) {}

  validate(flow: FlowDTO) {
    // Connectivity
    validateGraphConnectivity(flow.graph);
    // Per-node validations
    for (const node of flow.graph.nodes) {
      const def = this.registry.get(node.type);
      if (!def) throw new Error(`Unknown node type: ${node.type}`);
      if (def.validate) def.validate(node, flow.graph);
    }
    return { ok: true } as const;
  }

  async publish(orgId: string, flow: FlowDTO) {
    this.validate(flow);
    const { data, error } = await this.supa.getAdmin().from('flows').upsert({
      id: flow.id,
      organization_id: orgId,
      name: flow.name,
      status: flow.status,
      version: flow.version,
      graph: flow.graph
    }).select();
    if (error) throw error;
    const savedId = (data?.[0]?.id as string) ?? flow.id ?? '';
    const result = await this.engine.publishFlow(orgId, { ...flow, id: savedId });
    return { ...result, id: savedId };
  }

  async rollback(orgId: string, flowId: string, toVersion: number) {
    await this.engine.rollbackFlow(orgId, flowId, toVersion);
    return { ok: true } as const;
  }
}

