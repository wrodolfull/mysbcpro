import { Controller, Get, Param, Post } from '@nestjs/common';
import { QuotasService } from './quotas.service';

@Controller('quotas')
export class QuotasController {
  constructor(private readonly quotas: QuotasService) {}

  @Get(':orgId/:month')
  get(@Param('orgId') orgId: string, @Param('month') month: string) {
    return this.quotas.get(orgId, month);
  }

  @Post(':orgId/:month/tts/:units')
  addTts(@Param('orgId') orgId: string, @Param('month') month: string, @Param('units') units: string) {
    return this.quotas.addTts(orgId, month, Number(units));
  }
}

