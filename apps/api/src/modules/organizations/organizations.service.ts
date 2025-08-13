import { Injectable } from '@nestjs/common';
import type { OrganizationDTO } from '@mysbc/shared';

@Injectable()
export class OrganizationsService {
  private readonly orgs = new Map<string, OrganizationDTO>();

  upsert(org: OrganizationDTO) {
    const id = org.id ?? crypto.randomUUID();
    const next = { ...org, id };
    this.orgs.set(id, next);
    return next;
  }

  block(id: string, blocked: boolean, reason?: string) {
    const org = this.orgs.get(id);
    if (!org) throw new Error('org not found');
    org.blocked = blocked;
    org.blockReason = reason ?? null;
    return org;
  }
}

