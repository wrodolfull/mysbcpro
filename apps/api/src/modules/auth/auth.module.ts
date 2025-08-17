import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [OrganizationsModule],
  controllers: [AuthController]
})
export class AuthModule {}
