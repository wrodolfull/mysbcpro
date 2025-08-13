import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { QuotasModule } from '../quotas/quotas.module';

@Module({
  imports: [QuotasModule],
  controllers: [AudioController]
})
export class AudioModule {}

