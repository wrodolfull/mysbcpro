import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { EngineModule } from '../engine/engine.module';
import { FlowsService } from './flows.service';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [EngineModule, SupabaseModule],
  controllers: [FlowsController],
  providers: [FlowsService]
})
export class FlowsModule {}

