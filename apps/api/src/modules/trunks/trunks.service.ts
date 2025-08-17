import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { TrunkDTO } from '@mysbc/shared';
import { SupabaseService } from '../../supabase/supabase.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class TrunksService {
  private readonly logger = new Logger(TrunksService.name);

  constructor(private readonly supa: SupabaseService, private readonly engine: EngineService) {}

  async list(orgId: string, enabled?: boolean): Promise<TrunkDTO[]> {
    try {
      this.logger.log(`Listing trunks for org ${orgId}, enabled filter: ${enabled}`);
      
      let query = this.supa.getAdmin()
        .from('trunks')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (enabled !== undefined) {
        query = query.eq('enabled', enabled);
      }

      const { data, error } = await query;
      
      if (error) {
        this.logger.error('Failed to list trunks', error);
        throw error;
      }

      return data?.map(this.mapFromDB) || [];
    } catch (err) {
      this.logger.error('Error in TrunksService.list:', err);
      throw err;
    }
  }

  async findOne(orgId: string, id: string): Promise<TrunkDTO> {
    this.logger.log(`Finding trunk ${id} for org ${orgId}`);

    const { data, error } = await this.supa.getAdmin()
      .from('trunks')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Trunk ${id} not found`);
      }
      this.logger.error('Failed to find trunk', error);
      throw error;
    }

    return this.mapFromDB(data);
  }

  async create(trunk: Omit<TrunkDTO, 'id'>): Promise<TrunkDTO> {
    this.logger.log(`Creating trunk ${trunk.name} for org ${trunk.organizationId}`);

    // Validate required fields
    if (!trunk.name || !trunk.host) {
      throw new BadRequestException('Name and host are required');
    }

    // Check for duplicate name
    const { data: existing } = await this.supa.getAdmin()
      .from('trunks')
      .select('id')
      .eq('organization_id', trunk.organizationId)
      .eq('name', trunk.name)
      .single();

    if (existing) {
      throw new BadRequestException(`Trunk with name "${trunk.name}" already exists`);
    }

    const payload = this.mapToDB(trunk);
    const { data, error } = await this.supa.getAdmin()
      .from('trunks')
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create trunk', error);
      throw error;
    }

    const created = this.mapFromDB(data);
    this.logger.log(`Trunk ${created.id} created successfully`);
    
    return created;
  }

  async update(orgId: string, id: string, updates: Partial<Omit<TrunkDTO, 'id' | 'organizationId'>>): Promise<TrunkDTO> {
    this.logger.log(`Updating trunk ${id} for org ${orgId}`);

    // Check if trunk exists
    await this.findOne(orgId, id);

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const { data: existing } = await this.supa.getAdmin()
        .from('trunks')
        .select('id')
        .eq('organization_id', orgId)
        .eq('name', updates.name)
        .neq('id', id)
        .single();

      if (existing) {
        throw new BadRequestException(`Trunk with name "${updates.name}" already exists`);
      }
    }

    const payload = this.mapToDB({ ...updates, organizationId: orgId });
    delete payload.organization_id; // Don't update orgId

    const { data, error } = await this.supa.getAdmin()
      .from('trunks')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update trunk', error);
      throw error;
    }

    const updated = this.mapFromDB(data);
    this.logger.log(`Trunk ${id} updated successfully`);
    
    return updated;
  }

  async publish(orgId: string, id: string): Promise<{ ok: boolean; engineRef?: string }> {
    this.logger.log(`Publishing trunk ${id} for org ${orgId}`);

    const trunk = await this.findOne(orgId, id);
    
    try {
      await this.engine.upsertTrunk(orgId, trunk);
      
      // Mark as published in database
      await this.supa.getAdmin()
        .from('trunks')
        .update({ 
          updated_at: new Date().toISOString(),
          // You could add a 'published_at' field if needed
        })
        .eq('id', id)
        .eq('organization_id', orgId);

      this.logger.log(`Trunk ${id} published to engine successfully`);
      
      return { 
        ok: true, 
        engineRef: `${orgId}:trunk:${trunk.name}` 
      };
    } catch (error) {
      this.logger.error(`Failed to publish trunk ${id}`, error);
      throw new BadRequestException(`Failed to publish trunk: ${(error as Error).message}`);
    }
  }

  async testConnectivity(orgId: string, id: string): Promise<{ ok: boolean; details: any }> {
    this.logger.log(`Testing connectivity for trunk ${id} in org ${orgId}`);

    const trunk = await this.findOne(orgId, id);
    
    try {
      // Test engine health first
      const engineHealth = await this.engine.health();
      if (!engineHealth.ok) {
        return {
          ok: false,
          details: {
            error: 'Engine is not healthy',
            engineHealth
          }
        };
      }

      // Test gateway registration status
      const gatewayStatus = await this.engine.testGateway(trunk.name);
      return {
        ok: gatewayStatus.ok,
        details: {
          trunk: {
            name: trunk.name,
            host: trunk.host,
            transport: trunk.transport || 'udp',
            enabled: trunk.enabled,
            status: gatewayStatus.details?.status || 'Unknown'
          },
          engine: engineHealth.details,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Connectivity test failed for trunk ${id}`, error);
      return {
        ok: false,
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async remove(orgId: string, id: string): Promise<{ ok: boolean }> {
    this.logger.log(`Removing trunk ${id} for org ${orgId}`);

    const trunk = await this.findOne(orgId, id);
    
    try {
      // Remove from engine first
      await this.engine.removeTrunk(orgId, trunk.name);
      
      // Then remove from database
      const { error } = await this.supa.getAdmin()
        .from('trunks')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        this.logger.error('Failed to delete trunk from database', error);
        throw error;
      }

      this.logger.log(`Trunk ${id} removed successfully`);
      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to remove trunk ${id}`, error);
      throw error;
    }
  }

  private mapFromDB(data: any): TrunkDTO {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      host: data.host,
      enabled: data.enabled,
      username: data.username,
      secret: data.secret,
      transport: data.transport,
      srtp: data.srtp,
      proxy: data.proxy,
      registrar: data.registrar,
      expires: data.expires,
      codecs: data.codecs,
      dtmfMode: data.dtmf_mode,
      register: data.register,
      realm: data.realm,
      fromUser: data.from_user,
      fromDomain: data.from_domain,
      extension: data.extension,
      registerProxy: data.register_proxy,
      registerTransport: data.register_transport,
      retrySeconds: data.retry_seconds,
      callerIdInFrom: data.caller_id_in_from,
      contactParams: data.contact_params,
      ping: data.ping
    };
  }

  private mapToDB(dto: Partial<TrunkDTO>): any {
    return {
      organization_id: dto.organizationId,
      name: dto.name,
      host: dto.host,
      enabled: dto.enabled,
      username: dto.username ?? null,
      secret: dto.secret ?? null,
      transport: dto.transport ?? null,
      srtp: dto.srtp ?? null,
      proxy: dto.proxy ?? null,
      registrar: dto.registrar ?? null,
      expires: dto.expires ?? 300,
      codecs: dto.codecs ?? ['PCMU','PCMA'],
      dtmf_mode: dto.dtmfMode ?? null,
      register: dto.register ?? true,
      realm: dto.realm ?? null,
      from_user: dto.fromUser ?? null,
      from_domain: dto.fromDomain ?? null,
      extension: dto.extension ?? null,
      register_proxy: dto.registerProxy ?? null,
      register_transport: dto.registerTransport ?? null,
      retry_seconds: dto.retrySeconds ?? 30,
      caller_id_in_from: dto.callerIdInFrom ?? false,
      contact_params: dto.contactParams ?? null,
      ping: dto.ping ?? 25
    };
  }
}

