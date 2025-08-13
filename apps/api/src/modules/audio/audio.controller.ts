import { Body, Controller, Param, Post } from '@nestjs/common';
import type { TtsRequestDTO } from '@mysbc/shared';
import { QuotasService } from '../quotas/quotas.service';

function currentMonth() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

@Controller('audio')
export class AudioController {
  constructor(private readonly quotas: QuotasService) {}

  @Post(':orgId/tts')
  async tts(@Param('orgId') orgId: string, @Body() body: TtsRequestDTO) {
    const month = currentMonth();
    const q = this.quotas.get(orgId, month);
    const needed = body.text.length;
    if (q.usage.tts_units_used + needed > q.limits.tts_units) {
      throw new Error('TTS quota exceeded');
    }
    this.quotas.addTts(orgId, month, needed);
    return { ok: true, file: `/tenant/${orgId}/tts/${Date.now()}.wav`, used: needed };
  }
}

