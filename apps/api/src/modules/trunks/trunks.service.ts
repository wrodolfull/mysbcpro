import { Injectable } from '@nestjs/common';
import type { TrunkDTO } from '@mysbc/shared';
import { SupabaseService } from '../../supabase/supabase.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class TrunksService {
  constructor(private readonly supa: SupabaseService, private readonly engine: EngineService) {}

  async list(orgId: string) {
    const { data, error } = await this.supa.getAdmin()
      .from('trunks')
      .select('*')
      .eq('organization_id', orgId);
    if (error) throw error;
    return data as any as TrunkDTO[];
  }

  async upsert(trunk: TrunkDTO) {
    const payload = {
      organization_id: trunk.organizationId,
      name: trunk.name,
      host: trunk.host,
      enabled: trunk.enabled,
      username: trunk.username ?? null,
      secret: trunk.secret ?? null,
      transport: trunk.transport ?? null,
      srtp: trunk.srtp ?? null,
      proxy: trunk.proxy ?? null,
      registrar: trunk.registrar ?? null,
      expires: trunk.expires ?? 300,
      codecs: trunk.codecs ?? ['PCMU','PCMA'],
      dtmf_mode: trunk.dtmfMode ?? null
    };
    const { data, error } = await this.supa.getAdmin().from('trunks').upsert({ id: trunk.id, ...payload }).select();
    if (error) throw error;
    const saved = (data?.[0] ?? {}) as any;
    await this.engine.upsertTrunk(trunk.organizationId, trunk);
    return { ...trunk, id: saved.id ?? trunk.id } as TrunkDTO;
  }

  async remove(orgId: string, id: string) {
    const { error } = await this.supa.getAdmin().from('trunks').delete().eq('id', id).eq('organization_id', orgId);
    if (error) throw error;
    await this.engine.removeTrunk(orgId, id);
    return { ok: true };
  }
}

