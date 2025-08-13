export type IntegrationProvider =
  | 'http_generic'
  | 'google_calendar'
  | 'bitrix24'
  | 'mercado_pago'
  | 'shopee'
  | 'salesforce'
  | 'zoho'
  | 'hubspot'
  | 'hubsoft';

export interface IntegrationConfigDTO {
  id?: string;
  organizationId: string;
  provider: IntegrationProvider;
  name: string;
  config: Record<string, unknown>;
  secretsEncrypted: string; // encrypted blob
  enabled: boolean;
}

