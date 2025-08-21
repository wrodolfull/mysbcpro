import { Injectable, Logger } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import Handlebars from 'handlebars';
import type { EngineAdapter, TenantConfig } from './engine.adapter';
import type { FlowDTO, InboundDTO, TrunkDTO, FlowNodeBase } from '@mysbc/shared';

const execAsync = promisify(exec);

@Injectable()
export class FreeswitchEngineAdapter implements EngineAdapter {
  private readonly logger = new Logger(FreeswitchEngineAdapter.name);

  constructor() {
    this.registerHandlebarsHelpers();
  }

  private get fsBase() {
    // Always use the correct FreeSWITCH path for this system
    // This ensures consistency regardless of environment variables
    return '/usr/local/freeswitch/conf';
  }

  private get audioBase() {
    return process.env.ENGINE_AUDIO_DIR || '/var/lib/freeswitch/storage/tenant';
  }

  private get eslHost() {
    return process.env.ENGINE_ESL_HOST || '127.0.0.1';
  }

  private get eslPort() {
    return parseInt(process.env.ENGINE_ESL_PORT || '8021');
  }

  private get eslPassword() {
    return process.env.ENGINE_ESL_PASSWORD || 'ClueCon';
  }

  private tmpl(...p: string[]) {
    // Go up to workspace root from apps/api
    return path.join(process.cwd(), '..', '..', 'infra', 'engine', 'templates', ...p);
  }

  private async render(templatePath: string, context: any) {
    const tpl = await fs.readFile(templatePath, 'utf8');
    const compiled = Handlebars.compile(tpl);
    return compiled(context);
  }

  private registerHandlebarsHelpers() {
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('startsWith', (str, prefix) => str?.startsWith(prefix));
    Handlebars.registerHelper('substring', (str, start) => str?.substring(start));
  }

  private async executeESLCommand(command: string): Promise<string> {
    try {
      this.logger.log(`Executing ESL command: ${command}`);
      const cmd = `echo "${command}" | fs_cli -H ${this.eslHost} -P ${this.eslPort} -p ${this.eslPassword}`;
      this.logger.debug(`Full command: ${cmd}`);
      
      const { stdout, stderr } = await execAsync(cmd, { 
        timeout: 30000,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      // Check if there's stderr output (warnings/errors)
      if (stderr && stderr.trim()) {
        this.logger.warn(`ESL command stderr: ${stderr.trim()}`);
      }
      
      this.logger.debug(`ESL command result: ${stdout}`);
      return stdout;
    } catch (error) {
      this.logger.error(`ESL command failed: ${command}`, error);
      if (error instanceof Error) {
        this.logger.error(`Error details: ${error.message}`);
        if ('code' in error) {
          this.logger.error(`Exit code: ${error.code}`);
        }
        if ('signal' in error) {
          this.logger.error(`Signal: ${error.signal}`);
        }
      }
      throw new Error(`Failed to execute ESL command: ${command}`);
    }
  }

  async createTenant(config: TenantConfig): Promise<void> {
    this.logger.log(`Creating FreeSWITCH tenant: ${config.tenantId}`);
    
    try {
      // Create audio and recordings directories for tenant
      const audioDir = path.join(this.audioBase, config.tenantId);
      const recordingsDir = path.join('/usr/local/freeswitch/recordings', config.tenantId);
      
      await fs.mkdir(audioDir, { recursive: true });
      await fs.mkdir(recordingsDir, { recursive: true });

      // Generate SIP profile for tenant (saved directly in sip_profiles/external/)
      const sipProfileXml = await this.render(this.tmpl('tenant', 'sip_profile.xml.hbs'), config);
      const sipProfileFile = path.join(this.fsBase, 'sip_profiles', 'external', `${config.tenantId}_profile.xml`);
      await fs.writeFile(sipProfileFile, sipProfileXml, 'utf8');

      // Generate dialplan context (saved directly in dialplan/default/)
      const dialplanXml = await this.render(this.tmpl('tenant', 'dialplan_context.xml.hbs'), config);
      const dialplanFile = path.join(this.fsBase, 'dialplan', 'default', `${config.tenantId}_context.xml`);
      await fs.writeFile(dialplanFile, dialplanXml, 'utf8');

      // Generate directory structure (saved directly in directory/default/)
      const directoryXml = await this.render(this.tmpl('tenant', 'directory.xml.hbs'), config);
      const directoryFile = path.join(this.fsBase, 'directory', 'default', `${config.tenantId}_directory.xml`);
      await fs.writeFile(directoryFile, directoryXml, 'utf8');

      this.logger.log(`Tenant ${config.tenantId} configuration files created`);

      // Reload FreeSWITCH configuration
      await this.reload();
      
      this.logger.log(`FreeSWITCH tenant ${config.tenantId} created successfully`);

    } catch (error) {
      this.logger.error(`Failed to create tenant ${config.tenantId}`, error);
      throw error;
    }
  }

  async removeTenant(tenantId: string): Promise<void> {
    this.logger.log(`Removing FreeSWITCH tenant: ${tenantId}`);
    
    try {
      // Remove tenant configuration files from main FreeSWITCH directories
      const filesToRemove = [
        path.join(this.fsBase, 'sip_profiles', 'external', `${tenantId}_profile.xml`),
        path.join(this.fsBase, 'dialplan', 'default', `${tenantId}_context.xml`),
        path.join(this.fsBase, 'directory', 'default', `${tenantId}_directory.xml`)
      ];

      for (const file of filesToRemove) {
        try {
          await fs.unlink(file);
          this.logger.log(`Removed tenant file: ${file}`);
        } catch (error) {
          this.logger.warn(`Failed to remove tenant file ${file}`, error);
        }
      }

      // Remove tenant audio directory (keep recordings for compliance)
      const audioDir = path.join(this.audioBase, tenantId);
      try {
        await fs.rm(audioDir, { recursive: true, force: true });
      } catch (error) {
        this.logger.warn(`Failed to remove audio directory ${audioDir}`, error);
      }

      // Reload FreeSWITCH configuration
      await this.reload();
      
      this.logger.log(`FreeSWITCH tenant ${tenantId} removed successfully`);

    } catch (error) {
      this.logger.error(`Failed to remove tenant ${tenantId}`, error);
      throw error;
    }
  }

  async upsertTrunk(orgId: string, trunk: TrunkDTO): Promise<void> {
    this.logger.log(`Upserting trunk ${trunk.name} for org ${orgId}`);
    
    // Use the correct FreeSWITCH external directory
    const gatewayDir = '/usr/local/freeswitch/conf/sip_profiles/external';

    // Render gateway XML
    const gatewayXml = await this.render(this.tmpl('sip_profiles', 'gateway.xml.hbs'), { 
      trunk,
      organizationId: orgId 
    });

    // Write gateway file with org prefix to avoid conflicts
    const gatewayFile = path.join(gatewayDir, `${orgId}_${trunk.name}.xml`);
    await fs.writeFile(gatewayFile, gatewayXml, 'utf8');

    this.logger.log(`Gateway file written: ${gatewayFile}`);

    // Reload FreeSWITCH configuration
    await this.reloadSofiaProfile('external');
  }

  async removeTrunk(orgId: string, trunkName: string): Promise<void> {
    this.logger.log(`Removing trunk ${trunkName} for org ${orgId}`);
    
    // Use the correct FreeSWITCH external directory with org prefix
    const gatewayFile = path.join(
      '/usr/local/freeswitch/conf/sip_profiles/external',
      `${orgId}_${trunkName}.xml`
    );

    try {
      await fs.unlink(gatewayFile);
      this.logger.log(`Gateway file removed: ${gatewayFile}`);
      
      // Reload FreeSWITCH configuration
      await this.reloadSofiaProfile('external');
    } catch (error) {
      this.logger.warn(`Failed to remove gateway file: ${gatewayFile}`, error);
    }
  }

  async upsertInbound(orgId: string, inbound: InboundDTO): Promise<void> {
    this.logger.log(`Upserting inbound ${inbound.name} for org ${orgId}`);

    // Use the standard FreeSWITCH dialplan directory
    const dialplanDir = path.join(this.fsBase, 'dialplan', inbound.context);
    await fs.mkdir(dialplanDir, { recursive: true });

    // Render inbound entry XML
    const inboundXml = await this.render(this.tmpl('dialplan', 'inbound_entry.xml.hbs'), {
      inbound,
      organizationId: orgId
    });

    // Write inbound file with org prefix and priority for ordering
    const inboundFile = path.join(dialplanDir, `${orgId}_${String(inbound.priority).padStart(3, '0')}_${inbound.name}.xml`);
    await fs.writeFile(inboundFile, inboundXml, 'utf8');

    this.logger.log(`Inbound file written: ${inboundFile}`);

    // Reload dialplan
    await this.reloadDialplan();
  }

  async removeInbound(orgId: string, inboundName: string): Promise<void> {
    this.logger.log(`Removing inbound ${inboundName} for org ${orgId}`);

    // Remove from both contexts
    for (const context of ['public', 'default']) {
      const dialplanDir = path.join(this.fsBase, 'dialplan', context);
      
      try {
        const files = await fs.readdir(dialplanDir);
        const inboundFiles = files.filter(f => f.includes(`${orgId}_`) && f.includes(`_${inboundName}.xml`));
        
        for (const file of inboundFiles) {
          await fs.unlink(path.join(dialplanDir, file));
          this.logger.log(`Inbound file removed: ${file}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to scan/remove inbound files in ${dialplanDir}`, error);
      }
    }

    await this.reloadDialplan();
  }

  async publishFlow(orgId: string, flow: FlowDTO): Promise<{ engineRef: string }> {
    this.logger.log(`Publishing flow ${flow.name} v${flow.version} for org ${orgId}`);

    // Use the standard FreeSWITCH dialplan directory
    const flowDir = path.join(this.fsBase, 'dialplan', 'default');
    await fs.mkdir(flowDir, { recursive: true });

    // Ensure audio directory exists
    const audioPath = path.join(this.audioBase, orgId);
    await fs.mkdir(audioPath, { recursive: true });

    // Create context for template rendering
    const context = {
      flow,
      organizationId: orgId,
      audioPath,
      nodes: flow.graph.nodes,
      edges: flow.graph.edges
    };

    // Render flow execution XML
    const flowXml = await this.render(this.tmpl('dialplan', 'flow_execution.xml.hbs'), context);

    // Write flow file with org prefix to avoid conflicts
    const flowFile = path.join(flowDir, `${orgId}_flow_${flow.name}_v${flow.version}.xml`);
    await fs.writeFile(flowFile, flowXml, 'utf8');

    // Generate IVR menus if needed
    await this.generateIVRMenus(orgId, flow);

    // Generate CSAT surveys if needed
    await this.generateCSATSurveys(orgId, flow);

    this.logger.log(`Flow file written: ${flowFile}`);

    // Reload dialplan
    await this.reloadDialplan();

    const engineRef = `${orgId}:${flow.id}:v${flow.version}`;
    return { engineRef };
  }

  async removeFlow(orgId: string, flowId: string): Promise<void> {
    this.logger.log(`Removing flow ${flowId} for org ${orgId}`);

    const flowDir = path.join(this.fsBase, 'dialplan', 'default');
    
    try {
      // Remove all version files for this flow
      const files = await fs.readdir(flowDir);
      const flowFiles = files.filter(f => f.includes(`flow_${flowId}_`) || f.startsWith(`${orgId}_flow_`) && f.includes(flowId));
      
      for (const file of flowFiles) {
        await fs.unlink(path.join(flowDir, file));
        this.logger.log(`Removed flow file: ${file}`);
      }

      this.logger.log(`Flow ${flowId} removed from engine`);
      
      // Reload dialplan
      await this.reloadDialplan();
    } catch (error) {
      this.logger.error(`Failed to remove flow ${flowId}`, error);
      throw error;
    }
  }

  async rollbackFlow(orgId: string, flowId: string, toVersion: number): Promise<void> {
    this.logger.log(`Rolling back flow ${flowId} to version ${toVersion} for org ${orgId}`);

    const flowDir = path.join(this.fsBase, 'dialplan', 'default');
    
    try {
      // Remove current version files
      const files = await fs.readdir(flowDir);
      const currentFiles = files.filter(f => f.startsWith(`flow_${flowId}_v`) && !f.includes(`_v${toVersion}.xml`));
      
      for (const file of currentFiles) {
        await fs.unlink(path.join(flowDir, file));
        this.logger.log(`Removed flow file: ${file}`);
      }

      // The target version file should already exist
      const targetFile = path.join(flowDir, `flow_${flowId}_v${toVersion}.xml`);
      const exists = await fs.access(targetFile).then(() => true, () => false);
      
      if (!exists) {
        throw new Error(`Target version ${toVersion} file not found: ${targetFile}`);
      }

      await this.reloadDialplan();
      this.logger.log(`Flow ${flowId} rolled back to version ${toVersion}`);
    } catch (error) {
      this.logger.error(`Failed to rollback flow ${flowId}`, error);
      throw error;
    }
  }

  private async generateIVRMenus(orgId: string, flow: FlowDTO): Promise<void> {
    const ivrNodes = flow.graph.nodes.filter(n => n.type === 'ivr_capture');
    if (ivrNodes.length === 0) return;

    // Use the standard FreeSWITCH IVR menus directory
    const ivrDir = path.join(this.fsBase, 'ivr_menus');
    await fs.mkdir(ivrDir, { recursive: true });

    for (const node of ivrNodes) {
      const menuXml = await this.render(this.tmpl('ivr', 'menu.xml.hbs'), {
        node,
        organizationId: orgId,
        flowId: flow.id
      });

      // Use a more descriptive filename with org prefix to avoid conflicts
      const menuFile = path.join(ivrDir, `${orgId}_${flow.name}_${node.id}_menu.xml`);
      await fs.writeFile(menuFile, menuXml, 'utf8');
      this.logger.log(`IVR menu file written: ${menuFile}`);
    }
  }

  private async generateCSATSurveys(orgId: string, flow: FlowDTO): Promise<void> {
    const csatNodes = flow.graph.nodes.filter(n => n.type === 'survey_csat');
    if (csatNodes.length === 0) return;

    // Use the standard FreeSWITCH scripts directory
    const csatDir = path.join(this.fsBase, 'scripts', 'csat');
    await fs.mkdir(csatDir, { recursive: true });

    for (const node of csatNodes) {
      const csatScript = await this.render(this.tmpl('csat', 'survey_ivr.lua.hbs'), {
        node,
        organizationId: orgId,
        flowId: flow.id
      });

      // Use org prefix to avoid conflicts
      const scriptFile = path.join(csatDir, `${orgId}_${flow.name}_${node.id}_survey.lua`);
      await fs.writeFile(scriptFile, csatScript, 'utf8');
      this.logger.log(`CSAT script file written: ${scriptFile}`);
    }
  }

  async playAndGetDigits(cfg: {
    orgId: string;
    promptFile: string; 
    minDigits: number; 
    maxDigits: number; 
    timeoutMs: number; 
    tries: number; 
    regex?: string;
    onResultVar: string;
  }): Promise<void> {
    // This method is for runtime IVR execution via ESL
    // In practice, this would be called from a Lua script or ESL client
    const audioPath = path.join(this.audioBase, cfg.orgId);
    const command = `api play_and_get_digits ${cfg.minDigits} ${cfg.maxDigits} ${cfg.tries} ${cfg.timeoutMs} ${cfg.regex || '\\d+'} ${audioPath}/${cfg.promptFile} ${audioPath}/invalid.wav ${cfg.onResultVar}`;
    
    return this.executeESLCommand(command).then(() => {});
  }

  async recordCall(orgId: string, action: 'start' | 'stop', fileName: string): Promise<void> {
    const recordingsPath = path.join(this.audioBase, orgId, 'recordings');
    await fs.mkdir(recordingsPath, { recursive: true });
    
    const fullPath = path.join(recordingsPath, fileName);
    const command = action === 'start' 
      ? `api uuid_record ${fullPath}` 
      : `api uuid_record ${fullPath} stop`;
      
    return this.executeESLCommand(command).then(() => {});
  }

  private async reloadSofiaProfile(profile: string): Promise<void> {
    const reloadEnabled = process.env.ENGINE_RELOAD_DIALPLAN !== 'false';
    
    if (!reloadEnabled) {
      this.logger.log(`Sofia profile ${profile} reload disabled via ENGINE_RELOAD_DIALPLAN=false`);
      return;
    }
    
    try {
      await this.executeESLCommand(`sofia profile ${profile} restart reloadxml`);
      this.logger.log(`Sofia profile ${profile} reloaded successfully`);
    } catch (error) {
      this.logger.warn(`Failed to reload sofia profile ${profile} via ESL, but continuing operation`, error);
      // Don't throw error - just log warning and continue
    }
  }

  private async reloadDialplan(): Promise<void> {
    // Check if dialplan reload is enabled via environment variable
    const reloadEnabled = process.env.ENGINE_RELOAD_DIALPLAN !== 'false';
    
    if (!reloadEnabled) {
      this.logger.log('Dialplan reload disabled via ENGINE_RELOAD_DIALPLAN=false');
      return;
    }
    
    try {
      await this.executeESLCommand('reloadxml');
      this.logger.log('Dialplan reloaded successfully');
    } catch (error) {
      this.logger.warn('Failed to reload dialplan via ESL, but continuing operation', error);
      // Don't throw error - just log warning and continue
      // This allows the inbound to be published even if reload fails
    }
  }

  async reload(): Promise<void> {
    const reloadEnabled = process.env.ENGINE_RELOAD_DIALPLAN !== 'false';
    
    if (!reloadEnabled) {
      this.logger.log('FreeSWITCH reload disabled via ENGINE_RELOAD_DIALPLAN=false');
      return;
    }
    
    try {
      await this.executeESLCommand('reloadxml');
      await this.executeESLCommand('sofia profile external restart reloadxml');
      await this.executeESLCommand('sofia profile internal restart reloadxml');
      this.logger.log('FreeSWITCH configuration reloaded successfully');
    } catch (error) {
      this.logger.warn('Failed to reload FreeSWITCH configuration via ESL, but continuing operation', error);
      // Don't throw error - just log warning and continue
    }
  }

  async health(): Promise<{ ok: boolean; details?: any }> {
    try {
      const result = await this.executeESLCommand('sofia status');
      const isUp = result.includes('RUNNING') && !result.includes('DOWN');
      
      return {
        ok: isUp,
        details: {
          status: result.trim(),
          eslHost: this.eslHost,
          eslPort: this.eslPort,
          fsBase: this.fsBase,
          audioBase: this.audioBase
        }
      };
    } catch (error) {
      return {
        ok: false,
        details: {
          error: (error as Error).message,
          eslHost: this.eslHost,
          eslPort: this.eslPort
        }
      };
    }
  }

  async testGateway(gatewayName: string): Promise<{ ok: boolean; details?: any }> {
    try {
      const result = await this.executeESLCommand(`sofia status gateway ${gatewayName}`);
      const isRegistered = result.includes('REGED');
      
      return {
        ok: isRegistered,
        details: {
          status: result.trim(),
          gateway: gatewayName
        }
      };
    } catch (error) {
      return {
        ok: false,
        details: {
          error: (error as Error).message,
          gateway: gatewayName
        }
      };
    }
  }
}

