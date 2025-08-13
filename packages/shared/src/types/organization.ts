export interface OrganizationDTO {
  id?: string;
  name: string;
  slug: string;
  domain: string; // empresa.mysbc.pro
  webhookBase?: string | null;
  adminEmail: string;
  blocked: boolean;
  blockReason?: string | null;
  createdAt?: string;
}

