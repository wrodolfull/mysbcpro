export type Role = 'superadmin' | 'admin' | 'user';

export interface UserContext {
  userId: string;
  organizationId: string;
  roles: Role[];
}

