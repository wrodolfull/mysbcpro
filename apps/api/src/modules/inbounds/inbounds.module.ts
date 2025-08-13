import { Module } from '@nestjs/common';
import { InboundsController } from './inbounds.controller';
import { EngineModule } from '../engine/engine.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { InboundsService } from './inbounds.service';

@Module({
  imports: [EngineModule, SupabaseModule],
  controllers: [InboundsController],
  providers: [InboundsService]
})
export class InboundsModule {}

