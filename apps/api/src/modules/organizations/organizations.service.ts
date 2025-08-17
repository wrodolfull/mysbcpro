import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import type { OrganizationDTO } from '@mysbc/shared';
import { SupabaseService } from '../../supabase/supabase.service';
import { EngineService } from '../engine/engine.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly supa: SupabaseService,
    private readonly engine: EngineService
  ) {}

  async findById(id: string): Promise<OrganizationDTO> {
    this.logger.log(`Finding organization ${id}`);

    const { data, error } = await this.supa.getAdmin()
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      this.logger.error('Organization not found', error);
      throw new NotFoundException('Organization not found');
    }

    return this.mapFromDB(data);
  }

  async findByName(name: string): Promise<OrganizationDTO | null> {
    this.logger.log(`Finding organization by name: ${name}`);

    const { data, error } = await this.supa.getAdmin()
      .from('organizations')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      this.logger.error('Error finding organization by name', error);
      throw error;
    }

    return data ? this.mapFromDB(data) : null;
  }

  async create(org: Omit<OrganizationDTO, 'id'>): Promise<OrganizationDTO> {
    this.logger.log(`Creating organization: ${org.name}`);

    // Validate required fields
    if (!org.name) {
      throw new BadRequestException('Organization name is required');
    }

    // Check for duplicate name
    const existing = await this.findByName(org.name);
    if (existing) {
      throw new ConflictException(`Organization with name "${org.name}" already exists`);
    }

    // Generate FreeSWITCH tenant ID
    const freeswitchTenantId = `tenant_${org.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    const payload = this.mapToDB({ ...org, freeswitchTenantId });
    const { data, error } = await this.supa.getAdmin()
      .from('organizations')
      .insert(payload)
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create organization', error);
      throw error;
    }

    const created = this.mapFromDB(data);
    this.logger.log(`Organization ${created.id} created successfully`);

    // Create FreeSWITCH tenant
    try {
      await this.createFreeSwitchTenant(created);
      this.logger.log(`FreeSWITCH tenant created for organization ${created.id}`);
    } catch (error) {
      this.logger.error(`Failed to create FreeSWITCH tenant for organization ${created.id}`, error);
      // Don't fail the organization creation, but log the error
    }

    return created;
  }

  async update(id: string, updates: Partial<Omit<OrganizationDTO, 'id'>>): Promise<OrganizationDTO> {
    this.logger.log(`Updating organization ${id}`);

    // Check if organization exists
    await this.findById(id);

    // Check for duplicate name if updating name
    if (updates.name) {
      const existing = await this.findByName(updates.name);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Organization with name "${updates.name}" already exists`);
      }
    }

    const payload = this.mapToDB(updates);
    payload.updated_at = new Date().toISOString();

    const { data, error } = await this.supa.getAdmin()
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update organization ${id}`, error);
      throw error;
    }

    const updated = this.mapFromDB(data);
    this.logger.log(`Organization ${id} updated successfully`);
    
    return updated;
  }

  async block(id: string, blocked: boolean, reason?: string): Promise<OrganizationDTO> {
    this.logger.log(`${blocked ? 'Blocking' : 'Unblocking'} organization ${id}`);

    return this.update(id, { 
      blocked, 
      blockReason: blocked ? reason : null 
    });
  }

  private async createFreeSwitchTenant(org: OrganizationDTO): Promise<void> {
    const tenantId = org.freeswitchTenantId!;
    this.logger.log(`Creating FreeSWITCH tenant structure for ${tenantId}`);
    
    try {
      // Use the engine service to create tenant configuration
      await this.engine.createTenant({
        tenantId,
        organizationId: org.id!,
        organizationName: org.name,
        sipPort: this.getNextAvailableSipPort(),
        apiPassword: this.generateApiPassword()
      });
      
      this.logger.log(`FreeSWITCH tenant ${tenantId} created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create FreeSWITCH tenant ${tenantId}`, error);
      throw error;
    }
  }

  private getNextAvailableSipPort(): number {
    // Start from 5060 and find next available port
    // In production, you would track used ports in database
    return 5060 + Math.floor(Math.random() * 1000);
  }

  private generateApiPassword(): string {
    // Generate secure password for API user
    return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
  }

  private mapFromDB(data: any): OrganizationDTO {
    return {
      id: data.id,
      name: data.name,
      domain: data.domain,
      webhookBase: data.webhook_base,
      adminEmail: data.admin_email,
      blocked: data.blocked,
      blockReason: data.block_reason,
      freeswitchTenantId: data.freeswitch_tenant_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  private mapToDB(org: Partial<OrganizationDTO>): any {
    const result: any = {};
    
    if (org.name !== undefined) result.name = org.name;
    if (org.domain !== undefined) result.domain = org.domain;
    if (org.webhookBase !== undefined) result.webhook_base = org.webhookBase;
    if (org.adminEmail !== undefined) result.admin_email = org.adminEmail;
    if (org.blocked !== undefined) result.blocked = org.blocked;
    if (org.blockReason !== undefined) result.block_reason = org.blockReason;
    if (org.freeswitchTenantId !== undefined) result.freeswitch_tenant_id = org.freeswitchTenantId;
    
    return result;
  }
}

