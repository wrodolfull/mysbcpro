import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FreeSwitchController } from './freeswitch.controller';
import { EngineModule } from '../engine/engine.module';
import { FlowsService } from './flows.service';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [EngineModule, SupabaseModule],
  controllers: [FlowsController, FreeSwitchController],
  providers: [FlowsService]
})
export class FlowsModule {}

