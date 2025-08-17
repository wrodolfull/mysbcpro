import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { QuotasModule } from '../quotas/quotas.module';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [QuotasModule, SupabaseModule],
  controllers: [AudioController],
  providers: [AudioService]
})
export class AudioModule {}

