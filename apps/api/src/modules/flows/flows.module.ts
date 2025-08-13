import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { EngineModule } from '../engine/engine.module';
import { FlowsService } from './flows.service';

@Module({
  imports: [EngineModule],
  controllers: [FlowsController],
  providers: [FlowsService]
})
export class FlowsModule {}

