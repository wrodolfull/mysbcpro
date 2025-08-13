import { Injectable } from '@nestjs/common';
import type { QuotasDTO } from '@mysbc/shared';

@Injectable()
export class QuotasService {
  private readonly map = new Map<string, QuotasDTO>();

  get(orgId: string, month: string) {
    let q = this.map.get(`${orgId}:${month}`);
    if (!q) {
      q = {
        organizationId: orgId,
        month,
        limits: { tts_units: 3000, flow_exec: 100000 },
        usage: { tts_units_used: 0, flow_exec_used: 0 }
      };
      this.map.set(`${orgId}:${month}`, q);
    }
    return q;
  }

  addTts(orgId: string, month: string, units: number) {
    const q = this.get(orgId, month);
    q.usage.tts_units_used += units;
    return q;
  }
}

