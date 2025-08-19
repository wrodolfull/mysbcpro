import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { EngineService } from '../engine/engine.service';
import type { FlowDTO, FlowStatus } from '@mysbc/shared';
import { createDefaultRegistry } from '@mysbc/flow-nodes';
import { validateGraphConnectivity } from '@mysbc/flow-nodes';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);
  private readonly registry = createDefaultRegistry();

  constructor(private readonly engine: EngineService, private readonly supa: SupabaseService) {}

  async list(orgId: string, status?: FlowStatus): Promise<FlowDTO[]> {
    try {
      this.logger.log(`Listing flows for org ${orgId}, status filter: ${status}`);
      
      let query = this.supa.getAdmin()
        .from('flows')
        .select('*')
        .eq('organization_id', orgId)
        .order('updated_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      
      if (error) {
        this.logger.error('Failed to list flows', error);
        throw error;
      }

      return data?.map(this.mapFromDB) || [];
    } catch (err) {
      this.logger.error('Error in FlowsService.list:', err);
      throw err;
    }
  }

  async findOne(orgId: string, id: string): Promise<FlowDTO> {
    this.logger.log(`Finding flow ${id} for org ${orgId}`);

    const { data, error } = await this.supa.getAdmin()
      .from('flows')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Flow ${id} not found`);
      }
      this.logger.error('Failed to find flow', error);
      throw error;
    }

    return this.mapFromDB(data);
  }

  async create(flow: Omit<FlowDTO, 'id'>): Promise<FlowDTO> {
    this.logger.log(`Creating flow ${flow.name} for org ${flow.organizationId}`);

    // Validate required fields
    if (!flow.name) {
      throw new BadRequestException('Name is required');
    }

    if (!flow.graph || !flow.graph.nodes || flow.graph.nodes.length === 0) {
      throw new BadRequestException('Flow graph with nodes is required');
    }

    // Check for duplicate name
    const { data: existing } = await this.supa.getAdmin()
      .from('flows')
      .select('id')
      .eq('organization_id', flow.organizationId)
      .eq('name', flow.name)
      .single();

    if (existing) {
      throw new BadRequestException(`Flow with name "${flow.name}" already exists`);
    }

    // Start with draft status and version 1
    const newFlow: FlowDTO = {
      ...flow,
      status: 'draft',
      version: 1
    };

    const payload = this.mapToDB(newFlow);
    const { data, error } = await this.supa.getAdmin()
      .from('flows')
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create flow', error);
      throw error;
    }

    const created = this.mapFromDB(data);
    this.logger.log(`Flow ${created.id} created successfully`);
    
    return created;
  }

  async update(orgId: string, id: string, updates: Partial<Omit<FlowDTO, 'id' | 'organizationId'>>): Promise<FlowDTO> {
    this.logger.log(`Updating flow ${id} for org ${orgId}`);

    // Check if flow exists
    const existing = await this.findOne(orgId, id);

    // Don't allow updating published flows without proper versioning
    if (existing.status === 'published' && updates.graph) {
      throw new BadRequestException('Cannot modify graph of published flow. Create new version or change to draft first.');
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== existing.name) {
      const { data: duplicate } = await this.supa.getAdmin()
        .from('flows')
        .select('id')
        .eq('organization_id', orgId)
        .eq('name', updates.name)
        .neq('id', id)
        .single();

      if (duplicate) {
        throw new BadRequestException(`Flow with name "${updates.name}" already exists`);
      }
    }

    const payload = this.mapToDB({ ...updates, organizationId: orgId });
    delete payload.organization_id; // Don't update orgId
    delete payload.version; // Don't update version directly

    const { data, error } = await this.supa.getAdmin()
      .from('flows')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to update flow', error);
      throw error;
    }

    const updated = this.mapFromDB(data);
    this.logger.log(`Flow ${id} updated successfully`);
    
    return updated;
  }

  async validate(flow: FlowDTO, orgId?: string): Promise<{ ok: boolean; errors?: string[]; warnings?: string[] }> {
    this.logger.log(`Validating flow ${flow.name || 'unnamed'}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      if (!flow.graph || !flow.graph.nodes || flow.graph.nodes.length === 0) {
        errors.push('Flow must have at least one node');
        return { ok: false, errors };
      }

      // Check for start and end nodes
      const hasStart = flow.graph.nodes.some(n => n.type === 'start');
      const hasEnd = flow.graph.nodes.some(n => n.type === 'end');
      
      if (!hasStart) errors.push('Flow must have a start node');
      if (!hasEnd) warnings.push('Flow should have an end node');

      // Connectivity validation
      try {
    validateGraphConnectivity(flow.graph);
      } catch (error) {
        errors.push(`Connectivity error: ${(error as Error).message}`);
      }

    // Per-node validations
    for (const node of flow.graph.nodes) {
        try {
      const def = this.registry.get(node.type);
          if (!def) {
            errors.push(`Unknown node type: ${node.type} (node: ${node.id})`);
            continue;
          }

          if (def.validate) {
            def.validate(node, flow.graph);
          }

          // Validate TTS quota if needed
          if (node.type === 'tts' && orgId) {
            const ttsText = (node.data as any)?.text || '';
            if (ttsText.length > 1000) {
              warnings.push(`TTS node ${node.id} has long text (${ttsText.length} chars). Consider splitting.`);
            }
          }

          // Validate audio files if needed
          if (node.type === 'play_audio' && orgId) {
            const audioFile = (node.data as any)?.file;
            if (audioFile && !audioFile.startsWith('http')) {
              // In a real implementation, you'd check if the file exists in storage
              warnings.push(`Audio file ${audioFile} should be verified in storage`);
            }
          }

          // Validate integration references
          if (node.type === 'crm_condition' || node.type === 'http_request') {
            const integrationId = (node.data as any)?.integrationId;
            if (integrationId && orgId) {
              // In a real implementation, check if integration exists and is configured
              warnings.push(`Integration ${integrationId} should be verified`);
            }
          }

        } catch (error) {
          errors.push(`Node ${node.id} (${node.type}): ${(error as Error).message}`);
        }
      }

      const isValid = errors.length === 0;
      this.logger.log(`Flow validation completed: ${isValid ? 'valid' : 'invalid'}, ${errors.length} errors, ${warnings.length} warnings`);

      return {
        ok: isValid,
        ...(errors.length > 0 && { errors }),
        ...(warnings.length > 0 && { warnings })
      };

    } catch (error) {
      this.logger.error('Flow validation failed', error);
      return {
        ok: false,
        errors: [`Validation failed: ${(error as Error).message}`]
      };
    }
  }

  async validateById(orgId: string, id: string): Promise<{ ok: boolean; errors?: string[]; warnings?: string[] }> {
    const flow = await this.findOne(orgId, id);
    return this.validate(flow, orgId);
  }

  async publish(orgId: string, id: string, updatedFlow?: any): Promise<{ ok: boolean; engineRef?: string; version: number }> {
    this.logger.log(`Publishing flow ${id} for org ${orgId}`);

    // Use updated flow if provided, otherwise fetch from database
    let flow = updatedFlow;
    if (!flow) {
      flow = await this.findOne(orgId, id);
    }
    
    // Validate before publishing
    const validation = await this.validate(flow, orgId);
    if (!validation.ok) {
      throw new BadRequestException(`Flow validation failed: ${validation.errors?.join(', ')}`);
    }

    try {
      // Create new version if already published
      let newVersion = flow.version;
      if (flow.status === 'published') {
        newVersion = flow.version + 1;
      }

      // Update flow status and version
      const publishedFlow: FlowDTO = {
        ...flow,
        status: 'published',
        version: newVersion
      };

      // Save to database
      const { error } = await this.supa.getAdmin()
        .from('flows')
        .update({
          status: 'published',
          version: newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        this.logger.error('Failed to update flow status', error);
        throw error;
      }

      // Publish to engine
      const result = await this.engine.publishFlow(orgId, publishedFlow);

      this.logger.log(`Flow ${id} published to engine successfully as version ${newVersion}`);
      
      return { 
        ok: true, 
        engineRef: result.engineRef,
        version: newVersion
      };
    } catch (error) {
      this.logger.error(`Failed to publish flow ${id}`, error);
      throw new BadRequestException(`Failed to publish flow: ${(error as Error).message}`);
    }
  }

  async rollback(orgId: string, flowId: string, toVersion: number): Promise<{ ok: boolean; currentVersion: number }> {
    this.logger.log(`Rolling back flow ${flowId} to version ${toVersion} for org ${orgId}`);

    const flow = await this.findOne(orgId, flowId);

    if (flow.status !== 'published') {
      throw new BadRequestException('Can only rollback published flows');
    }

    if (toVersion >= flow.version) {
      throw new BadRequestException(`Cannot rollback to version ${toVersion}. Current version is ${flow.version}`);
    }

    if (toVersion < 1) {
      throw new BadRequestException('Invalid version number');
    }

    try {
      // Rollback in engine
      await this.engine.rollbackFlow(orgId, flowId, toVersion);

      // Update database
      const { error } = await this.supa.getAdmin()
        .from('flows')
        .update({
          version: toVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', flowId)
        .eq('organization_id', orgId);

      if (error) {
        this.logger.error('Failed to update flow version in database', error);
        throw error;
      }

      this.logger.log(`Flow ${flowId} rolled back to version ${toVersion}`);
      
      return { ok: true, currentVersion: toVersion };
    } catch (error) {
      this.logger.error(`Failed to rollback flow ${flowId}`, error);
      throw new BadRequestException(`Failed to rollback flow: ${(error as Error).message}`);
    }
  }

  async getVersions(orgId: string, flowId: string): Promise<{ versions: { version: number; publishedAt: string; status: string }[] }> {
    this.logger.log(`Getting versions for flow ${flowId} in org ${orgId}`);

    // In a real implementation, you'd store version history in a separate table
    // For now, we'll return the current version info
    const flow = await this.findOne(orgId, flowId);

    return {
      versions: [
        {
      version: flow.version,
          publishedAt: new Date().toISOString(), // This should come from version history table
          status: flow.status
        }
      ]
    };
  }

  async getExecutions(orgId: string, flowId: string, limit: number = 50, offset: number = 0): Promise<{ executions: any[]; total: number }> {
    this.logger.log(`Getting executions for flow ${flowId} in org ${orgId}`);

    const { data, error, count } = await this.supa.getAdmin()
      .from('executions')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('flow_id', flowId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      this.logger.error('Failed to get flow executions', error);
      throw error;
    }

    return {
      executions: data || [],
      total: count || 0
    };
  }

  async remove(orgId: string, id: string): Promise<{ ok: boolean }> {
    this.logger.log(`Removing flow ${id} for org ${orgId}`);

    const flow = await this.findOne(orgId, id);
    
    // Don't allow deleting published flows
    if (flow.status === 'published') {
      throw new ConflictException('Cannot delete published flow. Change to draft first or use versioning.');
    }

    try {
      // Remove from database
      const { error } = await this.supa.getAdmin()
        .from('flows')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        this.logger.error('Failed to delete flow from database', error);
        throw error;
      }

      this.logger.log(`Flow ${id} removed successfully`);
      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to remove flow ${id}`, error);
      throw error;
    }
  }

  private mapFromDB(data: any): FlowDTO {
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      status: data.status,
      version: data.version,
      graph: data.graph
    };
  }

  private mapToDB(dto: Partial<FlowDTO>): any {
    return {
      organization_id: dto.organizationId,
      name: dto.name,
      status: dto.status || 'draft',
      version: dto.version || 1,
      graph: dto.graph
    };
  }
}

