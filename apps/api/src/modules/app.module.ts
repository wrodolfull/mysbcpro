import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { EngineModule } from './engine/engine.module';
import { TrunksModule } from './trunks/trunks.module';
import { InboundsModule } from './inbounds/inbounds.module';
import { FlowsModule } from './flows/flows.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { QuotasModule } from './quotas/quotas.module';
import { EventsModule } from './events/events.module';
import { AudioModule } from './audio/audio.module';
import { CsatModule } from './csat/csat.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
      }
    }),
    HealthModule,
    EngineModule,
    TrunksModule,
    InboundsModule,
    FlowsModule,
    OrganizationsModule,
    QuotasModule,
    EventsModule,
    AudioModule,
    CsatModule,
    AuthModule
  ]
})
export class AppModule {}

