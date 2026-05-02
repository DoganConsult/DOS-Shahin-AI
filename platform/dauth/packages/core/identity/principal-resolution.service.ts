/**
 * DAuth Principal Resolution Service
 *
 * Standalone principal resolution extracted from identity.service.ts.
 * Resolves full principal identity from user+tenant, JWT tokens, or sessions.
 * Supports enrichment with roles, permissions, and scopes.
 *
 * Law 1: One canonical engine for principal resolution.
 * Law 2: DAuth owns identity resolution.
 * Law 9: Organized by concern (identity/).
 */
import { query, safeQuery, tenantSchema } from '@dos/db';
import { verifyAccessToken } from './token.service';
import { logAuthDecision } from '../audit/decision-log.service';
import type { PrincipalIdentity, PrincipalType } from './identity.service';
import { catchHandler, EC } from '@dos/platform-core/resilience';

/** In-memory principal cache with TTL tracking. */
const principalCache = new Map<string, { principal: PrincipalIdentity; expiresAt: number }>();

/** Default cache TTL in seconds. */
const DEFAULT_CACHE_TTL_SECONDS = 300;

/** Build a cache key from userId and tenantId. */
function cacheKey(userId: string, tenantId: string): string {
  return `${tenantId}:${userId}`;
}

/**
 * Resolve a full principal identity from user ID and tenant ID.
 * Validates tenant membership and returns null if user is not a member.
 */
export async function resolvePrincipal(
  userId: string,
  tenantId: string,
): Promise<PrincipalIdentity | null> {
  const cached = principalCache.get(cacheKey(userId, tenantId));
  if (cached && cached.expiresAt > Date.now()) {
    return cached.principal;
  }

  const [userResult, membershipResult] = await Promise.all([
    query(
      `SELECT user_id, email, tenant_id, role, status, name, language,
              COALESCE((SELECT TRUE FROM user_mfa WHERE user_id = u.user_id AND enabled = TRUE LIMIT 1), FALSE) AS mfa_enabled,
              last_login_at, user_type
       FROM users u WHERE user_id = $1 LIMIT 1`,
      [userId],
    ),
    query(
      `SELECT status, membership_type, role FROM tenant_user_memberships
       WHERE user_id = $1 AND tenant_id = $2 AND status = 'active' LIMIT 1`,
      [userId, tenantId],
    ),
  ]);

  if (!userResult.rows.length) return null;
  if (!membershipResult.rows.length) return null;

  const row = userResult.rows[0];
  const principalType: PrincipalType =
    row.user_type === 'service_account' ? 'service_account'
    : row.user_type === 'agent' ? 'agent'
    : row.user_type === 'external' ? 'external'
    : 'human';

  const principal: PrincipalIdentity = {
    userId: row.user_id,
    email: row.email,
    tenantId,
    role: membershipResult.rows[0].role || row.role,
    status: row.status || 'active',
    principalType,
    name: row.name,
    language: row.language,
    mfaEnabled: row.mfa_enabled === true,
    lastLoginAt: row.last_login_at,
  };

  principalCache.set(cacheKey(userId, tenantId), {
    principal,
    expiresAt: Date.now() + DEFAULT_CACHE_TTL_SECONDS * 1000,
  });

  return principal;
}

/**
 * Extract principal from a JWT access token.
 * Verifies the token signature, then resolves the full principal from the database.
 * Throws 'INVALID_TOKEN' if the token is invalid or principal cannot be resolved.
 */
export async function resolvePrincipalFromToken(
  token: string,
): Promise<PrincipalIdentity> {
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    throw new Error('INVALID_TOKEN');
  }

  if (!decoded.userId || !decoded.tenantId) {
    throw new Error('INVALID_TOKEN');
  }

  const principal = await resolvePrincipal(decoded.userId, decoded.tenantId);
  if (!principal) {
    throw new Error('PRINCIPAL_NOT_FOUND');
  }

  return principal;
}

/**
 * Extract principal from a session ID.
 * Looks up the session in the sessions table, then resolves the full principal.
 * Throws 'SESSION_NOT_FOUND' if session does not exist or is revoked/expired.
 */
export async function resolvePrincipalFromSession(
  sessionId: string,
): Promise<PrincipalIdentity> {
  const sessionResult = await safeQuery(
    `SELECT user_id, tenant_id, revoked_at, expires_at
     FROM sessions
     WHERE session_id = $1 LIMIT 1`,
    [sessionId],
  );

  if (!sessionResult.rows.length) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const session = sessionResult.rows[0];

  if (session.revoked_at) {
    throw new Error('SESSION_REVOKED');
  }

  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    throw new Error('SESSION_EXPIRED');
  }

  const principal = await resolvePrincipal(session.user_id, session.tenant_id);
  if (!principal) {
    throw new Error('PRINCIPAL_NOT_FOUND');
  }

  return principal;
}

/**
 * Enrich a principal with optional fields such as roles, permissions, scopes, and authorities.
 * Supported enrichment keys: 'roles', 'permissions', 'scopes', 'authorities', 'accessProfiles'.
 * Returns a new object with the enrichment data attached.
 */
export async function enrichPrincipal(
  principal: PrincipalIdentity,
  enrichments: string[],
): Promise<PrincipalIdentity & {
  roles?: string[];
  permissions?: string[];
  scopes?: Array<{ scopeType: string; scopeId: string; roleCode: string }>;
  authorities?: string[];
  accessProfiles?: string[];
}> {
  const schema = tenantSchema(principal.tenantId);
  const enriched: PrincipalIdentity & {
    roles?: string[];
    permissions?: string[];
    scopes?: Array<{ scopeType: string; scopeId: string; roleCode: string }>;
    authorities?: string[];
    accessProfiles?: string[];
  } = { ...principal };

  const queries: Promise<void>[] = [];

  if (enrichments.includes('roles')) {
    queries.push(
      safeQuery(
        `SELECT DISTINCT role_code FROM "${schema}".enterprise_user_role_assignments
         WHERE user_id = $1 AND is_active = TRUE
           AND (valid_to IS NULL OR valid_to > NOW())`,
        [principal.userId],
      ).then((result) => {
        enriched.roles = result.rows
          .map((r: Record<string, unknown>) => String(r.role_code ?? ''))
          .filter(Boolean);
      }).catch(() => { enriched.roles = []; }),
    );
  }

  if (enrichments.includes('permissions')) {
    queries.push(
      safeQuery(
        `SELECT DISTINCT rp.permission_code
         FROM "${schema}".enterprise_user_role_assignments ura
         JOIN "${schema}".role_permissions rp ON rp.role_id = ura.role_id
         WHERE ura.user_id = $1 AND ura.is_active = TRUE
           AND (ura.valid_to IS NULL OR ura.valid_to > NOW())`,
        [principal.userId],
      ).then((result) => {
        enriched.permissions = result.rows
          .map((r: Record<string, unknown>) => String(r.permission_code ?? ''))
          .filter(Boolean);
      }).catch(() => { enriched.permissions = []; }),
    );
  }

  if (enrichments.includes('scopes')) {
    queries.push(
      safeQuery(
        `SELECT DISTINCT scope_type, scope_id, role_code
         FROM "${schema}".enterprise_user_role_assignments
         WHERE user_id = $1 AND is_active = TRUE
           AND scope_type IS NOT NULL AND scope_id IS NOT NULL
           AND (valid_to IS NULL OR valid_to > NOW())`,
        [principal.userId],
      ).then((result) => {
        enriched.scopes = result.rows.map((r: Record<string, unknown>) => ({
          scopeType: String(r.scope_type ?? ''),
          scopeId: String(r.scope_id ?? ''),
          roleCode: String(r.role_code ?? ''),
        }));
      }).catch(() => { enriched.scopes = []; }),
    );
  }

  if (enrichments.includes('authorities')) {
    queries.push(
      safeQuery(
        `SELECT DISTINCT authority_code FROM "${schema}".decision_authorities
         WHERE user_id = $1 AND is_active = TRUE`,
        [principal.userId],
      ).then((result) => {
        enriched.authorities = result.rows
          .map((r: Record<string, unknown>) => String(r.authority_code ?? ''))
          .filter(Boolean);
      }).catch(() => { enriched.authorities = []; }),
    );
  }

  if (enrichments.includes('accessProfiles')) {
    queries.push(
      safeQuery(
        `SELECT access_profile_code FROM "${schema}".user_access_profiles
         WHERE user_id = $1 AND is_active = TRUE`,
        [principal.userId],
      ).then((result) => {
        enriched.accessProfiles = result.rows
          .map((r: Record<string, unknown>) => String(r.access_profile_code ?? ''))
          .filter(Boolean);
      }).catch(() => { enriched.accessProfiles = []; }),
    );
  }

  await Promise.all(queries);
  return enriched;
}

/**
 * Get full principal context including actor type, memberships, and status.
 * Returns a comprehensive context object suitable for authorization decisions.
 */
export async function getPrincipalContext(
  userId: string,
  tenantId: string,
): Promise<{
  principal: PrincipalIdentity;
  memberships: Array<{ tenantId: string; role: string; membershipType: string; status: string }>;
  actorType: PrincipalType;
  isSuperAdmin: boolean;
  activeTenantCount: number;
} | null> {
  const principal = await resolvePrincipal(userId, tenantId);
  if (!principal) return null;

  const schema = tenantSchema(tenantId);

  const [membershipsResult, profilesResult] = await Promise.all([
    safeQuery(
      `SELECT tenant_id, role, membership_type, status
       FROM tenant_user_memberships
       WHERE user_id = $1 AND status = 'active'`,
      [userId],
    ).catch(() => ({ rows: [] })),
    safeQuery(
      `SELECT access_profile_code FROM "${schema}".user_access_profiles
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    ).catch(() => ({ rows: [] })),
  ]);

  const memberships = (membershipsResult as { rows: Record<string, unknown>[] }).rows.map((r) => ({
    tenantId: r.tenant_id as string,
    role: r.role as string,
    membershipType: (r.membership_type as string) || 'member',
    status: r.status as string,
  }));

  const accessProfiles = (profilesResult as { rows: Record<string, unknown>[] }).rows
    .map((r) => r.access_profile_code as string)
    .filter(Boolean);

  return {
    principal,
    memberships,
    actorType: principal.principalType,
    isSuperAdmin: accessProfiles.includes('platform_super_admin'),
    activeTenantCount: memberships.length,
  };
}

/**
 * Validate that a principal is active and not locked.
 * Returns true only if the principal exists, has 'active' status,
 * and has an active tenant membership.
 */
export async function validatePrincipal(
  principal: PrincipalIdentity,
): Promise<boolean> {
  if (principal.status !== 'active') {
    await logAuthDecision(principal.tenantId, {
      userId: principal.userId,
      permissionCode: 'identity.validate',
      decision: 'deny',
      reason: `Principal status is '${principal.status}', expected 'active'`,
    }).catch(catchHandler(EC.EVENT_BUS));
    return false;
  }

  const membershipResult = await safeQuery(
    `SELECT 1 FROM tenant_user_memberships
     WHERE user_id = $1 AND tenant_id = $2 AND status = 'active' LIMIT 1`,
    [principal.userId, principal.tenantId],
  );

  if (!membershipResult.rows.length) {
    await logAuthDecision(principal.tenantId, {
      userId: principal.userId,
      permissionCode: 'identity.validate',
      decision: 'deny',
      reason: 'No active tenant membership found',
    }).catch(catchHandler(EC.EVENT_BUS));
    return false;
  }

  return true;
}

/**
 * Cache a resolved principal with an optional TTL.
 * Uses in-memory cache keyed by tenantId:userId.
 */
export function cachePrincipal(
  principal: PrincipalIdentity,
  ttlSeconds?: number,
): void {
  const ttl = ttlSeconds ?? DEFAULT_CACHE_TTL_SECONDS;
  principalCache.set(cacheKey(principal.userId, principal.tenantId), {
    principal,
    expiresAt: Date.now() + ttl * 1000,
  });
}

/**
 * Invalidate the cached principal for a specific user+tenant pair.
 * Should be called when a user's identity, roles, or memberships change.
 */
export function invalidatePrincipalCache(
  userId: string,
  tenantId: string,
): void {
  principalCache.delete(cacheKey(userId, tenantId));
}
