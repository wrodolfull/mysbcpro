import { Body, Controller, Post, Headers, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrganizationsService } from '../organizations/organizations.service';

@ApiTags('Auth Webhooks')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly orgsService: OrganizationsService
  ) {}

  @Post('webhook/signup')
  @ApiOperation({ summary: 'Handle user signup webhook from Supabase' })
  @ApiResponse({ status: 200, description: 'Signup processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async handleSignupWebhook(
    @Headers('authorization') authHeader: string,
    @Body() payload: any
  ) {
    this.logger.log('Received signup webhook', { payload });

    // Validate webhook (in production, verify JWT or secret)
    if (!authHeader) {
      throw new BadRequestException('Missing authorization header');
    }

    try {
      const { type, record } = payload;

      if (type === 'INSERT' && record?.email) {
        const orgName = record.raw_user_meta_data?.org_name;
        
        if (orgName) {
          this.logger.log(`Creating organization for user ${record.email}: ${orgName}`);
          
          // Create organization
          const org = await this.orgsService.create({
            name: orgName,
            adminEmail: record.email,
            blocked: false
          });

          this.logger.log(`Organization created: ${org.id} for user ${record.email}`);

          // Here you could also update the user's JWT claims
          // to include the organization_id for RLS policies
          
          return { 
            success: true, 
            organizationId: org.id,
            freeswitchTenantId: org.freeswitchTenantId
          };
        } else {
          this.logger.warn(`No org_name in user metadata for ${record.email}`);
        }
      }

      return { success: true, message: 'Webhook processed' };

    } catch (error) {
      this.logger.error('Error processing signup webhook', error);
      throw new BadRequestException(`Webhook processing failed: ${(error as Error).message}`);
    }
  }

  @Post('webhook/user-update')
  @ApiOperation({ summary: 'Handle user update webhook from Supabase' })
  @ApiResponse({ status: 200, description: 'User update processed successfully' })
  async handleUserUpdateWebhook(
    @Headers('authorization') authHeader: string,
    @Body() payload: any
  ) {
    this.logger.log('Received user update webhook', { payload });

    // Handle user updates if needed
    return { success: true, message: 'User update webhook processed' };
  }
}
