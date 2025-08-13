import { Module } from '@nestjs/common';
import { TrunksController } from './trunks.controller';
import { EngineModule } from '../engine/engine.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { TrunksService } from './trunks.service';

@Module({
  imports: [EngineModule, SupabaseModule],
  controllers: [TrunksController],
  providers: [TrunksService]
})
export class TrunksModule {}

