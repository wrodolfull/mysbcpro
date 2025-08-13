import { Module } from '@nestjs/common';
import { EngineService } from './engine.service';
import { FreeswitchEngineAdapter } from './freeswitch.adapter';

@Module({
  providers: [
    EngineService,
    {
      provide: 'ENGINE_ADAPTER',
      useClass: FreeswitchEngineAdapter
    }
  ],
  exports: ['ENGINE_ADAPTER', EngineService]
})
export class EngineModule {}

