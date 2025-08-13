import { Module } from '@nestjs/common';
import { CsatController } from './csat.controller';

@Module({
  controllers: [CsatController]
})
export class CsatModule {}

