import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import type { InboundDTO, InboundContext } from '@mysbc/shared';
import { SupabaseService } from '../../supabase/supabase.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class InboundsService {
  private readonly logger = new Logger(InboundsService.name);

  constructor(private readonly supa: SupabaseService, private readonly engine: EngineService) {}

  async list(orgId: string, context?: InboundContext, enabled?: boolean): Promise<InboundDTO[]> {
    try {
      this.logger.log(`Listing inbounds for org ${orgId}, context: ${context}, enabled: ${enabled}`);
      
      let query = this.supa.getAdmin()
        .from('inbounds')
        .select('*')
        .eq('organization_id', orgId)
        .order('priority', { ascending: true });

      if (context) {
        query = query.eq('context', context);
      }

      if (enabled !== undefined) {
        query = query.eq('enabled', enabled);
      }

      const { data, error } = await query;
      
      if (error) {
        this.logger.error('Failed to list inbounds', error);
        throw error;
      }

      return data?.map(this.mapFromDB) || [];
    } catch (err) {
      this.logger.error('Error in InboundsService.list:', err);
      throw err;
    }
  }

  async findOne(orgId: string, id: string): Promise<InboundDTO> {
    this.logger.log(`Finding inbound ${id} for org ${orgId}`);

    const { data, error } = await this.supa.getAdmin()
      .from('inbounds')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Inbound connector ${id} not found`);
      }
      this.logger.error('Failed to find inbound', error);
      throw error;
    }

    return this.mapFromDB(data);
  }

  async create(inbound: Omit<InboundDTO, 'id'>): Promise<InboundDTO> {
    this.logger.log(`Creating inbound ${inbound.name} for org ${inbound.organizationId}`);

    // Validate required fields
    if (!inbound.name || !inbound.didOrUri) {
      throw new BadRequestException('Name and DID/URI are required');
    }

    if (!['public', 'default'].includes(inbound.context)) {
      throw new BadRequestException('Context must be "public" or "default"');
    }

    // Check for duplicate name
    const { data: existing } = await this.supa.getAdmin()
      .from('inbounds')
      .select('id')
      .eq('organization_id', inbound.organizationId)
      .eq('name', inbound.name)
      .single();

    if (existing) {
      throw new BadRequestException(`Inbound connector with name "${inbound.name}" already exists`);
    }

    // Check for duplicate DID/URI in same context
    const { data: existingDid } = await this.supa.getAdmin()
      .from('inbounds')
      .select('id')
      .eq('organization_id', inbound.organizationId)
      .eq('did_or_uri', inbound.didOrUri)
      .eq('context', inbound.context)
      .single();

    if (existingDid) {
      throw new BadRequestException(`DID/URI "${inbound.didOrUri}" already exists in context "${inbound.context}"`);
    }

    const payload = this.mapToDB(inbound);
    const { data, error } = await this.supa.getAdmin()
      .from('inbounds')
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create inbound', error);
      throw error;
    }

    const created = this.mapFromDB(data);
    this.logger.log(`Inbound ${created.id} created successfully`);
    
    return created;
  }

  async update(orgId: string, id: string, updates: Partial<Omit<InboundDTO, 'id' | 'organizationId'>>): Promise<InboundDTO> {
    this.logger.log(`Updating inbound ${id} for org ${orgId}`);

    // Check if inbound exists
    await this.findOne(orgId, id);

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const { data: existing } = await this.supa.getAdmin()
        .from('inbounds')
        .select('id')
        .eq('organization_id', orgId)
        .eq('name', updates.name)
        .neq('id', id)
        .single();

      if (existing) {
        throw new BadRequestException(`Inbound connector with name "${updates.name}" already exists`);
      }
    }

    // Check for duplicate DID/URI if being updated
    if (updates.didOrUri && updates.context) {
      const { data: existingDid } = await this.supa.getAdmin()
        .from('inbounds')
        .select('id')
        .eq('organization_id', orgId)
        .eq('did_or_uri', updates.didOrUri)
        .eq('context', updates.context)
        .neq('id', id)
        .single();

      if (existingDid) {
        throw new BadRequestException(`DID/URI "${updates.didOrUri}" already exists in context "${updates.context}"`);
      }
    }

    const payload = this.mapToDB({ ...updates, organizationId: orgId });
    delete payload.organization_id; // Don't update orgId

    const { data, error } = await this.supa.getAdmin()
      .from('inbounds')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update inbound', error);
      throw error;
    }

    const updated = this.mapFromDB(data);
    this.logger.log(`Inbound ${id} updated successfully`);
    
    return updated;
  }

  async publish(orgId: string, id: string): Promise<{ ok: boolean; engineRef?: string }> {
    this.logger.log(`Publishing inbound ${id} for org ${orgId}`);

    const inbound = await this.findOne(orgId, id);
    
    try {
      await this.engine.upsertInbound(orgId, inbound);
      
      // Mark as published in database
      await this.supa.getAdmin()
        .from('inbounds')
        .update({ 
          updated_at: new Date().toISOString(),
          // You could add a 'published_at' field if needed
        })
        .eq('id', id)
        .eq('organization_id', orgId);

      this.logger.log(`Inbound ${id} published to engine successfully`);
      
      return { 
        ok: true, 
        engineRef: `${orgId}:inbound:${inbound.name}:${inbound.context}` 
      };
    } catch (error) {
      this.logger.error(`Failed to publish inbound ${id}`, error);
      throw new BadRequestException(`Failed to publish inbound connector: ${(error as Error).message}`);
    }
  }

  async testRouting(orgId: string, id: string): Promise<{ ok: boolean; details: any }> {
    this.logger.log(`Testing routing for inbound ${id} in org ${orgId}`);

    const inbound = await this.findOne(orgId, id);
    
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

      // Check if target flow exists and is published
      let targetFlowStatus = null;
      if (inbound.targetFlowId) {
        const { data: flow } = await this.supa.getAdmin()
          .from('flows')
          .select('id, name, status, version')
          .eq('id', inbound.targetFlowId)
          .eq('organization_id', orgId)
          .single();

        targetFlowStatus = flow ? {
          id: flow.id,
          name: flow.name,
          status: flow.status,
          version: flow.version,
          isPublished: flow.status === 'published'
        } : { error: 'Target flow not found' };
      }

      return {
        ok: true,
        details: {
          inbound: {
            name: inbound.name,
            didOrUri: inbound.didOrUri,
            context: inbound.context,
            priority: inbound.priority,
            enabled: inbound.enabled
          },
          targetFlow: targetFlowStatus,
          routing: {
            canRoute: inbound.enabled && (inbound.targetFlowId ? targetFlowStatus?.isPublished : true),
            warnings: this.getRoutingWarnings(inbound, targetFlowStatus)
          },
          engine: engineHealth.details,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`Routing test failed for inbound ${id}`, error);
      return {
        ok: false,
        details: {
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private getRoutingWarnings(inbound: InboundDTO, targetFlowStatus: any): string[] {
    const warnings: string[] = [];

    if (!inbound.enabled) {
      warnings.push('Inbound connector is disabled');
    }

    if (inbound.targetFlowId && !targetFlowStatus) {
      warnings.push('Target flow not found');
    }

    if (inbound.targetFlowId && targetFlowStatus && !targetFlowStatus.isPublished) {
      warnings.push('Target flow is not published');
    }

    if (!inbound.targetFlowId) {
      warnings.push('No target flow configured - calls will get default handling');
    }

    return warnings;
  }

  async remove(orgId: string, id: string): Promise<{ ok: boolean }> {
    this.logger.log(`Removing inbound ${id} for org ${orgId}`);

    const inbound = await this.findOne(orgId, id);
    
    try {
      // Remove from engine first
      await this.engine.removeInbound(orgId, inbound.name);
      
      // Then remove from database
      const { error } = await this.supa.getAdmin()
        .from('inbounds')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        this.logger.error('Failed to delete inbound from database', error);
        throw error;
      }

      this.logger.log(`Inbound ${id} removed successfully`);
      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to remove inbound ${id}`, error);
      throw error;
    }
  }

  private mapFromDB(data: any): InboundDTO {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      didOrUri: data.did_or_uri,
      callerIdNumber: data.caller_id_number,
      networkAddr: data.network_addr,
      context: data.context,
      priority: data.priority,
      matchRules: data.match_rules,
      targetFlowId: data.target_flow_id,
      enabled: data.enabled
    };
  }

  private mapToDB(dto: Partial<InboundDTO>): any {
    return {
      organization_id: dto.organizationId,
      name: dto.name,
      did_or_uri: dto.didOrUri,
      caller_id_number: dto.callerIdNumber ?? null,
      network_addr: dto.networkAddr ?? null,
      context: dto.context,
      priority: dto.priority ?? 100,
      match_rules: dto.matchRules ?? null,
      target_flow_id: dto.targetFlowId ?? null,
      enabled: dto.enabled ?? true
    };
  }
}

