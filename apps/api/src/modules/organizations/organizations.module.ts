import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { SupabaseModule } from '../../supabase/supabase.module';
import { EngineModule } from '../engine/engine.module';

@Module({
  imports: [SupabaseModule, EngineModule],
  providers: [OrganizationsService],
  controllers: [OrganizationsController],
  exports: [OrganizationsService]
})
export class OrganizationsModule {}

