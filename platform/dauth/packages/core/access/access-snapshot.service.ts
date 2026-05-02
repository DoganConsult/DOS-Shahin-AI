import { logger } from '@dos/platform-core/observability';
import { safeQuery, tenantSchema } from '@dos/db';
import { v4 as uuid } from 'uuid';
import type { FullAccessSnapshot, ActorInfo, TenantMembership, AuditTraceMeta } from '../contracts/access-snapshot.contract';
import type { ScopeBinding } from '../contracts/scope-resolution.contract';

export type { FullAccessSnapshot as AccessSnapshot };

export async function getAccessSnapshot(
  tenantId: string,
  userId: string,
): Promise<FullAccessSnapshot> {
  const schema = tenantSchema(tenantId);
  const start = Date.now();

  const actor: ActorInfo = { userId, email: '', displayName: '', actorType: 'human', identityPosture: 'password', mfaVerified: false };
  const tenant: TenantMembership = { tenantId, tenantStatus: 'active', plan: 'standard', membershipStatus: 'active', membershipType: 'member', joinedAt: '' };

  let effectivePermissions: string[] = [];
  let accessProfiles: string[] = [];
  let functionalRoles: string[] = [];
  let decisionAuthorities: string[] = [];
  let allowedModules: string[] = [];
  let scopeBindings: ScopeBinding[] = [];

  // Parallelize all context fetching queries
  const [
    userResult,
    membershipResult,
    tenantResult,
    profilesResult,
    assignmentsResult,
    permissionsResult,
    authoritiesResult
  ] = await Promise.all([
    // 1. Identity
    safeQuery(
      `SELECT email, COALESCE(first_name || ' ' || last_name, username, email) AS display_name
       FROM public.users WHERE user_id = $1 LIMIT 1`,
      [userId]
    ).catch(() => ({ rows: [] })),

    // 2. Membership
    safeQuery(
      `SELECT status, membership_type, created_at FROM public.tenant_user_memberships
       WHERE tenant_id = $1 AND user_id = $2 AND status = 'active' LIMIT 1`,
      [tenantId, userId]
    ).catch(() => ({ rows: [] })),

    // 3. Tenant status
    safeQuery(
      `SELECT status, plan FROM public.tenants WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    ).catch(() => ({ rows: [] })),

    // 4. Access Profiles
    safeQuery(
      `SELECT access_profile_code FROM "${schema}".user_access_profiles
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    ).catch(() => ({ rows: [] })),

    // 5. Role Assignments & Modules
    safeQuery(
      `SELECT DISTINCT role_code, module_code, scope_type, scope_id
       FROM "${schema}".enterprise_user_role_assignments
       WHERE user_id = $1 AND is_active = TRUE
         AND (valid_to IS NULL OR valid_to > NOW())`,
      [userId]
    ).catch(() => ({ rows: [] })),

    // 6. Permissions
    safeQuery(
      `SELECT DISTINCT rp.permission_code
       FROM "${schema}".enterprise_user_role_assignments ura
       JOIN "${schema}".role_permissions rp ON rp.role_id = ura.role_id
       WHERE ura.user_id = $1 AND ura.is_active = TRUE
         AND (ura.valid_to IS NULL OR ura.valid_to > NOW())`,
      [userId]
    ).catch(() => ({ rows: [] })),

    // 7. Decision Authorities
    safeQuery(
      `SELECT DISTINCT authority_code FROM "${schema}".decision_authorities
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    ).catch(() => ({ rows: [] }))
  ]);

  // Process User Identity
  if (userResult.rows[0]) {
    actor.email = userResult.rows[0].email || '';
    actor.displayName = userResult.rows[0].display_name || '';
  }

  // Process Membership
  if (membershipResult.rows[0]) {
    tenant.membershipStatus = membershipResult.rows[0].status;
    tenant.membershipType = membershipResult.rows[0].membership_type || 'member';
    tenant.joinedAt = membershipResult.rows[0].created_at?.toISOString?.() || '';
  }

  // Process Tenant
  if (tenantResult.rows[0]) {
    tenant.tenantStatus = tenantResult.rows[0].status || 'active';
    tenant.plan = tenantResult.rows[0].plan || 'standard';
  }

  // Process Access Profiles
  accessProfiles = profilesResult.rows.map((r: any) => r.access_profile_code).filter(Boolean);

  // Process Role Assignments & Modules
  const raRows = assignmentsResult.rows;
  functionalRoles = [...new Set(raRows.map((r: any) => r.role_code).filter(Boolean) as string[])];
  allowedModules = [...new Set(raRows.map((r: any) => r.module_code).filter(Boolean) as string[])];
  scopeBindings = raRows
    .filter((r: any) => r.scope_type && r.scope_id)
    .map((r: any) => ({ scopeType: r.scope_type as ScopeBinding['scopeType'], scopeId: String(r.scope_id), roleCode: String(r.role_code), inherited: false }));

  // Process Permissions
  effectivePermissions = permissionsResult.rows.map((r: any) => r.permission_code).filter(Boolean);

  // Process Authorities
  decisionAuthorities = authoritiesResult.rows.map((r: any) => r.authority_code).filter(Boolean);

  const isSuperAdmin = accessProfiles.includes('platform_super_admin');
  const duration = Date.now() - start;

  if (duration > 200) {
    logger.warn(`[AccessSnapshot] Late snapshot for user ${userId} in tenant ${tenantId}: ${duration}ms`);
  }

  const auditTrace: AuditTraceMeta = {
    snapshotGeneratedAt: new Date().toISOString(),
    correlationId: uuid(),
    cacheHit: false,
    evaluationDurationMs: duration,
  };

  return {
    actor,
    tenant,
    accessProfiles,
    functionalRoles,
    effectivePermissions,
    scopeBindings,
    decisionAuthorities,
    allowedModules,
    allowedProducts: [],
    allowedDashboards: [],
    landingHint: {
      landingPage: isSuperAdmin ? '/admin' : '/workspace-home',
      fallbackPage: '/workspace-home',
    },
    audit: auditTrace,
  };
}


async function resolveRoleMapping(
  schema: string,
  role: string,
): Promise<{ accessProfile: string; functionalRoles: string[] }> {
  const fallback = { accessProfile: 'restricted_viewer', functionalRoles: [] as string[] };

  try {
    const result = await safeQuery(
      `SELECT access_profile_code, functional_role_codes
       FROM "${schema}".role_profile_mappings
       WHERE legacy_role_code = $1 AND is_active = TRUE
       LIMIT 1`,
      [role],
    );

    if (result.rows[0]) {
      return {
        accessProfile: result.rows[0].access_profile_code || fallback.accessProfile,
        functionalRoles: result.rows[0].functional_role_codes || [],
      };
    }
  } catch (_e) { /* non-critical */ }

  try {
    const profileResult = await safeQuery(
      `SELECT profile_code FROM "${schema}".access_profiles
       WHERE profile_code = $1 AND is_active = TRUE LIMIT 1`,
      [role],
    );
    if (profileResult.rows[0]) {
      return { accessProfile: profileResult.rows[0].profile_code, functionalRoles: [] };
    }
  } catch (_e) { /* non-critical */ }

  return fallback;
}

export async function provisionAccessFromRole(
  tenantId: string,
  userId: string,
  role: string,
  actorId: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const mapping = await resolveRoleMapping(schema, role);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".user_access_profiles (user_id, access_profile_code, is_active, created_by)
       VALUES ($1, $2, TRUE, $3)
       ON CONFLICT (user_id, access_profile_code) DO UPDATE SET is_active = TRUE, updated_at = NOW()`,
      [userId, mapping.accessProfile, actorId],
    );
  } catch (_e) { /* non-critical */ }

  for (const roleCode of mapping.functionalRoles) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".enterprise_user_role_assignments
           (user_id, role_code, is_active, created_by, valid_from)
         VALUES ($1, $2, TRUE, $3, NOW())
         ON CONFLICT DO NOTHING`,
        [userId, roleCode, actorId],
      );
    } catch (_e) { /* non-critical */ }
  }
}

export async function canPerform(
  tenantId: string,
  userId: string,
  permissionCode: string,
): Promise<boolean> {
  const snapshot = await getAccessSnapshot(tenantId, userId);
  return snapshot.effectivePermissions.includes(permissionCode);
}

export const accessSnapshotService = {
  getUserAuthzPayload: getAccessSnapshot,
  provisionFromLegacyRole: provisionAccessFromRole,
  can: canPerform,
};
