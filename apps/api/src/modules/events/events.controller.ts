import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EventsService } from './events.service';
import type { EventRecord, ExecutionRecord } from '@mysbc/shared';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post(':orgId')
  push(@Param('orgId') orgId: string, @Body() body: Omit<EventRecord, 'organizationId'>) {
    this.events.pushEvent({ ...body, organizationId: orgId } as EventRecord);
    return { ok: true };
  }

  @Post(':orgId/executions')
  pushExec(@Param('orgId') orgId: string, @Body() body: Omit<ExecutionRecord, 'organizationId'>) {
    this.events.pushExec({ ...body, organizationId: orgId } as ExecutionRecord);
    return { ok: true };
  }

  @Get(':orgId')
  list(@Param('orgId') orgId: string) {
    return this.events.listEvents(orgId);
  }

  @Get(':orgId/executions')
  listExec(@Param('orgId') orgId: string) {
    return this.events.listExecs(orgId);
  }
}

