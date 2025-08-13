import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { FlowDTO } from '@mysbc/shared';
import { FlowsService } from './flows.service';

@Controller('flows')
export class FlowsController {
  constructor(private readonly flows: FlowsService) {}

  @Post(':orgId/validate')
  validate(@Param('orgId') _orgId: string, @Body() flow: FlowDTO) {
    return this.flows.validate(flow);
  }

  @Post(':orgId/publish')
  publish(@Param('orgId') orgId: string, @Body() flow: FlowDTO) {
    return this.flows.publish(orgId, flow);
  }

  @Post(':orgId/rollback/:flowId/:toVersion')
  rollback(
    @Param('orgId') orgId: string,
    @Param('flowId') flowId: string,
    @Param('toVersion') toVersion: string
  ) {
    return this.flows.rollback(orgId, flowId, Number(toVersion));
  }

  @Get(':orgId/versions/:flowId')
  versions(@Param('orgId') _orgId: string, @Param('flowId') _flowId: string) {
    return { versions: [] };
  }
}

