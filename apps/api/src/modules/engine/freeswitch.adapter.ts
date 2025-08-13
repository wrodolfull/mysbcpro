import { Injectable } from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import Handlebars from 'handlebars';
import type { EngineAdapter } from './engine.adapter';
import type { FlowDTO, InboundDTO, TrunkDTO } from '@mysbc/shared';

@Injectable()
export class FreeswitchEngineAdapter implements EngineAdapter {
  private get fsBase() {
    return process.env.ENGINE_FS_BASE_DIR || '/etc/freeswitch';
  }
  private get audioBase() {
    return process.env.ENGINE_AUDIO_DIR || '/var/lib/freeswitch/storage/tenant';
  }
  private tmpl(...p: string[]) {
    return path.join(process.cwd(), 'infra', 'engine', 'templates', ...p);
  }
  private async render(templatePath: string, context: any) {
    const tpl = await fs.readFile(templatePath, 'utf8');
    const compiled = Handlebars.compile(tpl);
    return compiled(context);
  }
  async upsertTrunk(orgId: string, trunk: TrunkDTO): Promise<void> {
    const outDir = path.join(this.fsBase, 'sip_profiles', `tenant_${orgId}`);
    await fs.mkdir(outDir, { recursive: true });
    const xml = await this.render(this.tmpl('sip_profiles', 'gateway.xml.hbs'), { trunk });
    await fs.writeFile(path.join(outDir, `${trunk.name}.xml`), xml, 'utf8');
  }

  async removeTrunk(orgId: string, trunkId: string): Promise<void> {
    // TODO: implement removal and reload
  }

  async upsertInbound(orgId: string, inbound: InboundDTO): Promise<void> {
    const ctx = inbound.context;
    const outDir = path.join(this.fsBase, 'dialplan', `tenant_${orgId}`, ctx);
    await fs.mkdir(outDir, { recursive: true });
    const xml = `<include>
  <!-- inbound ${inbound.name} priority ${inbound.priority} -->
</include>`;
    await fs.writeFile(path.join(outDir, `${inbound.name}.xml`), xml, 'utf8');
  }

  async removeInbound(orgId: string, inboundId: string): Promise<void> {
    // TODO: implement removal and reload
  }

  async publishFlow(orgId: string, flow: FlowDTO): Promise<{ engineRef: string }> {
    // TODO: translate graph to dialplan/ivr and write versioned files
    return { engineRef: `${orgId}:${flow.id ?? 'new' }:v${flow.version}` };
  }

  async rollbackFlow(orgId: string, flowId: string, toVersion: number): Promise<void> {
    // TODO: restore previous artifacts and reload
  }

  async playAndGetDigits(_cfg: {
    orgId: string;
    promptFile: string; minDigits: number; maxDigits: number; timeoutMs: number; tries: number; regex?: string;
    onResultVar: string;
  }): Promise<void> {
    // exposed for runtime IVR execution via ESL in future extensions
  }

  async recordCall(_orgId: string, _action: 'start' | 'stop', _fileName: string): Promise<void> {
    // noop placeholder
  }

  async reload(): Promise<void> {
    // TODO: run reloadxml and sofia rescans (exec ESL or fs_cli)
  }

  async health(): Promise<{ ok: boolean; details?: any }> {
    return { ok: true };
  }
}

