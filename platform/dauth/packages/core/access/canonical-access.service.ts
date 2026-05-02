// @deprecated @removal-date 2026-09-30 | @owner DAuth | @replacement platform/dauth/access/access-snapshot.service.ts
// Backward-compat adapter. Delegates authz resolution to access-snapshot.service (canonical engine, Law 1).
// Wrong-layer import from modules/admin (enterprise-authz) removed — replaced by accessSnapshotService.
// BootstrapService cross-layer import retained under approved bridge until Phase 7 bootstrap migration.
import { safeQuery, tenantSchema } from '@dos/db';
import { getFirstRow } from '@dos/db';
import { getEffectiveModules } from '@dos/platform-core/modules';
import { accessSnapshotService } from './access-snapshot.service';
import { logger } from '@dos/platform-core/observability';
import type {
  ResolverAccessSnapshot as AccessSnapshot,
  ResolverStatus,
  AccountStatus,
  AccessSnapshotTenantMembership,
} from './canonical-access.types';
import { AccessResolverError } from './canonical-access.types';

type _AuthzPayload = {
  accessProfiles?: string[];
  functionalRoles?: string[];
  permissions?: string[];
  effectivePermissions?: string[];
  scopes?: Array<{ moduleCode: string; scopeType: string; scopeId: number | null }>;
  scopeBindings?: Array<{ scopeType: string; scopeId: string; roleCode: string }>;
};

const SNAPSHOT_CACHE_TTL = 30_000;

const snapshotCache = new Map<string, { data: AccessSnapshot; expiresAt: number }>();
const bootstrapDataCache = new Map<string, { data: unknown; expiresAt: number }>();

function cacheKey(userId: string, tenantId: string): string {
  return `${userId}:${tenantId}`;
}

export function invalidateSnapshotCache(userId: string, tenantId?: string): void {
  if (tenantId) {
    const k = cacheKey(userId, tenantId);
    snapshotCache.delete(k);
    bootstrapDataCache.delete(k);
  } else {
    for (const key of snapshotCache.keys()) {
      if (key.startsWith(`${userId}:`)) snapshotCache.delete(key);
    }
    for (const key of bootstrapDataCache.keys()) {
      if (key.startsWith(`${userId}:`)) bootstrapDataCache.delete(key);
    }
  }
}

export function clearSnapshotCache(): void {
  snapshotCache.clear();
  bootstrapDataCache.clear();
}

export function getCachedBootstrapData(userId: string, tenantId: string): unknown | null {
  const entry = bootstrapDataCache.get(cacheKey(userId, tenantId));
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  return null;
}

export async function resolveAccessSnapshot(
  userId: string,
  tenantId: string,
  opts?: { sessionId?: string | null },
): Promise<AccessSnapshot> {
  const key = cacheKey(userId, tenantId);
  const cached = snapshotCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const resolverErrors: string[] = [];
  let resolverStatus: ResolverStatus = 'ok';

  const userResult = await safeQuery(
    `SELECT user_id, email, name, full_name, role, status, is_super_admin, onboarding_complete
     FROM public.users WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  const user = getFirstRow(userResult) as Record<string, unknown> | undefined;
  if (!user) {
    throw new AccessResolverError('User not found', 401, 'USER_NOT_FOUND');
  }

  const userStatus = ((user.status as string) || 'active').toLowerCase() as AccountStatus;
  if (userStatus === 'suspended') {
    throw new AccessResolverError('Account suspended', 403, 'ACCOUNT_SUSPENDED');
  }
  if (userStatus === 'inactive' || userStatus === 'deactivated') {
    throw new AccessResolverError('Account inactive', 403, 'ACCOUNT_INACTIVE');
  }

  const tenantResult = await safeQuery(
    `SELECT tenant_id, org_name, status FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
    [tenantId],
  );
  const tenant = getFirstRow(tenantResult) as Record<string, unknown> | undefined;
  if (!tenant) {
    throw new AccessResolverError('Tenant not found', 401, 'TENANT_NOT_FOUND');
  }

  const tenantStatus = ((tenant.status as string) || 'active').toLowerCase();
  if (tenantStatus === 'suspended' || tenantStatus === 'deleted') {
    throw new AccessResolverError('Tenant suspended', 403, 'TENANT_SUSPENDED');
  }

  let membership: AccessSnapshotTenantMembership | null = null;
  try {
    const memberResult = await safeQuery(
      `SELECT role, is_primary FROM public.tenant_user_memberships
       WHERE user_id = $1 AND tenant_id = $2 AND COALESCE(status, 'active') = 'active'
       ORDER BY is_primary DESC LIMIT 1`,
      [userId, tenantId],
    );
    const row = getFirstRow(memberResult) as Record<string, unknown> | undefined;
    if (row) {
      membership = { role: row.role as string, isPrimary: row.is_primary === true };
    }
  } catch {
    resolverErrors.push('tenant_membership');
  }

  const schema = tenantSchema(tenantId);

  let productEntitlements: Array<{ productCode: string; licensedModules: string[] }> = [];
  try {
    const entResult = await safeQuery(
      `SELECT product_code, licensed_modules
       FROM "${schema}".product_user_entitlements
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    );
    productEntitlements = entResult.rows.map((r: any) => ({
      productCode: r.product_code as string,
      licensedModules: Array.isArray(r.licensed_modules) ? r.licensed_modules as string[] : [],
    }));
  } catch {
    resolverErrors.push('product_entitlements');
  }

  let effectiveModules: string[] = [];
  try {
    const result = await getEffectiveModules(tenantId, userId);
    effectiveModules = result.modules;
  } catch (err: unknown) {
    resolverErrors.push('effective_modules');
    logger.warn('[CanonicalAccess] getEffectiveModules failed:', err);
  }

  let authzPermissions: string[] = [];
  let authzScopes: Array<{ moduleCode: string; scopeType: string; scopeId: number | null }> = [];
  let authzFunctionalRoles: string[] = [];
  let authzAccessProfiles: string[] = [];
  try {
    const raw = await accessSnapshotService.getUserAuthzPayload(tenantId, userId);
    const payload = raw as unknown as _AuthzPayload;
    authzPermissions = payload.permissions ?? payload.effectivePermissions ?? [];
    authzScopes = (payload.scopes ?? []) as Array<{ moduleCode: string; scopeType: string; scopeId: number | null }>;
    authzFunctionalRoles = payload.functionalRoles ?? [];
    authzAccessProfiles = payload.accessProfiles ?? [];
  } catch {
    resolverErrors.push('enterprise_authz');
  }

  let landingPage = '/workspace-home';
  let dashboardWidgets: string[] = [];
  let defaultDashboard: string | null = null;
  try {
    // Decoupled BootstrapService per Law 15. The UI calls /api/me/bootstrap independently.
    // We provide basic defaults here to satisfy snapshot interfaces without reverse imports.
    landingPage = '/workspace-home';
    dashboardWidgets = [];
    defaultDashboard = null;
  } catch {
    // legacy block, kept strictly structured
  }

  if (resolverErrors.length > 0) {
    const critical = resolverErrors.filter(e =>
      e === 'effective_modules' || e === 'enterprise_authz',
    );
    if (critical.length >= 2) {
      resolverStatus = 'failed';
    } else if (critical.length === 1) {
      resolverStatus = 'partial';
    }
  }

  const platformRole = (user.role as string) || 'user';
  const isSuperAdmin = user.is_super_admin === true;

  const platformRoles: string[] = [platformRole];
  if (isSuperAdmin && !platformRoles.includes('super_admin')) {
    platformRoles.push('super_admin');
  }

  const tenantRoles: string[] = [];
  if (membership?.role) tenantRoles.push(membership.role);
  if (platformRole && !tenantRoles.includes(platformRole)) tenantRoles.push(platformRole);

  const visibleProducts = productEntitlements.length > 0
    ? [...new Set(productEntitlements.map(e => e.productCode))]
    : ['shahin-ai'];

  const workspaceCanAccess = effectiveModules.includes('workspace') ||
    isSuperAdmin ||
    authzAccessProfiles.some(p => p === 'platform_super_admin' || p === 'tenant_admin');

  if (
    resolverStatus === 'ok' &&
    authzPermissions.length === 0 &&
    effectiveModules.length === 0 &&
    !isSuperAdmin &&
    authzAccessProfiles.length === 0 &&
    authzFunctionalRoles.length === 0
  ) {
    throw new AccessResolverError('No access', 403, 'NO_ACCESS');
  }

  const snapshot: AccessSnapshot = {
    version: new Date().toISOString(),
    resolverStatus,
    resolverErrors,
    identity: { userId, tenantId, sessionId: opts?.sessionId ?? null },
    platform: {
      isActive: true,
      isSuperAdmin,
      accountStatus: userStatus,
      activeSessions: 0,
    },
    tenant: {
      tenantId,
      tenantStatus,
      orgName: (tenant.org_name as string) || null,
      membership,
    },
    access: {
      platformRoles,
      tenantRoles,
      accessProfiles: authzAccessProfiles,
      functionalRoles: authzFunctionalRoles,
      permissions: authzPermissions,
      scopes: authzScopes,
    },
    products: {
      visibleProducts,
      visibleModules: effectiveModules,
    },
    workspace: {
      canAccess: workspaceCanAccess,
      defaultDashboard,
    },
    nav: {
      landingPage,
      dashboardWidgets,
    },
  };

  snapshotCache.set(key, { data: snapshot, expiresAt: Date.now() + SNAPSHOT_CACHE_TTL });

  return snapshot;
}
