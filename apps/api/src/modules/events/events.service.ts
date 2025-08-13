import { Injectable } from '@nestjs/common';
import type { EventRecord, ExecutionRecord } from '@mysbc/shared';

@Injectable()
export class EventsService {
  private readonly events: EventRecord[] = [];
  private readonly execs: ExecutionRecord[] = [];

  pushEvent(e: EventRecord) {
    this.events.push({ ...e, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  }
  pushExec(x: ExecutionRecord) {
    this.execs.push({ ...x, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  }
  listEvents(orgId: string) {
    return this.events.filter(e => e.organizationId === orgId);
  }
  listExecs(orgId: string) {
    return this.execs.filter(e => e.organizationId === orgId);
  }
}

