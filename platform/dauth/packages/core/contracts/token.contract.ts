/**
 * Token service contract — JWT payload structure for DAuth tokens.
 * Consumed by any service that decodes or verifies DAuth access tokens.
 */

export interface AuthPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  role_code?: string;
  is_super_admin?: boolean;
  permissions?: string[];
  jti?: string;
  language?: string;
  departmentId?: string;
  name?: string;
  role_profile?: string;
  roles?: string[];
  archetypes?: string[];
  orgUnitIds?: string[];
  mustChangePassword?: boolean;
  principalType?: 'human' | 'agent' | 'service';
}
