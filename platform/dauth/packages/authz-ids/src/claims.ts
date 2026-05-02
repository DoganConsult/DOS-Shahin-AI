/**
 * Canonical JWT claim shape emitted by Keycloak and consumed by DAuth. Every
 * new protocol mapper added to the realm MUST be reflected here. DAuth's
 * principal-resolution service uses this interface as the authoritative input
 * contract — services never read the raw token.
 */

import type { ProductCode, RoleCode, TenantId, UserId, WorkspaceId } from './ids.js';

export type AcrLevel = 'aal1' | 'aal2' | 'aal3';

export interface CanonicalAccessTokenClaims {
  readonly iss: string;
  readonly aud: string | readonly string[];
  readonly sub: UserId;
  readonly azp: string;
  readonly sid?: string;
  readonly exp: number;
  readonly iat: number;
  readonly auth_time?: number;
  readonly nbf?: number;
  readonly jti: string;
  readonly typ?: 'Bearer' | 'JWT' | 'ID';
  readonly scope?: string;
  readonly acr?: AcrLevel | string;
  readonly amr?: readonly string[];

  readonly realm_access?: { roles: readonly string[] };
  readonly resource_access?: Record<string, { roles: readonly string[] }>;
  readonly groups?: readonly string[];

  readonly email?: string;
  readonly email_verified?: boolean;
  readonly preferred_username?: string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly locale?: string;

  readonly dos_user_id?: UserId;
  readonly dos_tenant_id?: TenantId;
  readonly dos_workspace_id?: WorkspaceId;
  readonly dos_product_code?: ProductCode;
  readonly dos_role_profile?: RoleCode;
  readonly dos_acr_required?: AcrLevel;
  readonly dos_risk_score?: string;
  /**
   * Bootstrap lifecycle marker stamped on the Keycloak user attribute and
   * mirrored into the access token's claims:
   *   - 'pending'          — user registered, bootstrap not yet attempted
   *   - 'ready'            — bootstrap completed; user has a tenant + entitlements
   *   - 'retryable_failed' — bootstrap rolled back due to an ops-fixable cause
   *                          (catalog drift, schema drift). KC user stays
   *                          enabled so they can retry once ops resolves it.
   *                          See oidc.routes.ts FAILED branch + Group D.
   *   - 'failed'           — bootstrap rolled back due to an unknown / unsafe
   *                          cause; KC user is disabled as a safety backstop.
   */
  readonly dos_bootstrap_status?: 'pending' | 'ready' | 'retryable_failed' | 'failed';

  readonly cnf?: { readonly jkt?: string; readonly 'x5t#S256'?: string };
}

export const CANONICAL_SCOPES = {
  openid: 'openid',
  profile: 'profile',
  email: 'email',
  offlineAccess: 'offline_access',
  groups: 'groups',
  realmRoles: 'realm-roles',
} as const;

export const CANONICAL_CLAIM_KEYS = [
  'dos_user_id',
  'dos_tenant_id',
  'dos_workspace_id',
  'dos_product_code',
  'dos_role_profile',
  'dos_acr_required',
  'dos_risk_score',
  'dos_bootstrap_status',
] as const;

export type CanonicalClaimKey = (typeof CANONICAL_CLAIM_KEYS)[number];
