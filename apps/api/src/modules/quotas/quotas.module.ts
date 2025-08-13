import { Module } from '@nestjs/common';
import { QuotasController } from './quotas.controller';
import { QuotasService } from './quotas.service';

@Module({
  controllers: [QuotasController],
  providers: [QuotasService],
  exports: [QuotasService]
})
export class QuotasModule {}

