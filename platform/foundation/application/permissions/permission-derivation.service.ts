import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logPolicyDecision } from '../../ports/blueprint.port';
import { getActiveModuleCodes } from '../../ports/platform.port';

const AUTHORITY_RANK: Record<string, number> = {
  view: 1,
  submit: 2,
  review: 3,
  approve_low: 4,
  approve_medium: 5,
  approve_high: 6,
  approve: 7,
  manage: 8,
  super_admin: 9,
};

const ROLE_LANDING_PAGE: Record<string, string> = {
  risk_manager: '/risk/register',
  compliance_officer: '/compliance/overview',
  audit_lead: '/audit/overview',
  admin: '/admin-hub',
};

const MODULE_WIDGETS: Record<string, string> = {
  risk: 'risk_heatmap',
  compliance: 'compliance_posture',
  audit: 'audit_pipeline',
  incident: 'incident_timeline',
};

interface PermissionChain {
  user_id: string;
  platform_role: string;
  access_profile_code: string | null;
  bundles: string[];
  functional_roles: string[];
  permissions: string[];
  module_codes: string[];
  authority_levels: Record<string, string>;
}

export async function deriveUserPermissions(tenantId: string, userId: string): Promise<PermissionChain> {
  const schema = tenantSchema(tenantId);

  const userResult = await safeQuery(
    `SELECT role FROM "${schema}".users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  const platformRole = userResult.rows[0]?.role ?? 'user';

  const profileResult = await safeQuery(
    `SELECT access_profile_code FROM "${schema}".user_access_profiles WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  const accessProfileCode: string | null = profileResult.rows[0]?.access_profile_code ?? null;

  const assignmentsResult = await safeQuery(
    `SELECT functional_role_code, module_code, authority_level
     FROM "${schema}".enterprise_user_role_assignments
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY functional_role_code`,
    [userId],
  );

  const functionalRoles: string[] = [];
  const moduleCodes = new Set<string>();
  const authorityLevels: Record<string, string> = {};

  for (const row of assignmentsResult.rows) {
    if (!functionalRoles.includes(row.functional_role_code)) {
      functionalRoles.push(row.functional_role_code);
    }
    if (row.module_code) moduleCodes.add(row.module_code);

    const existing = authorityLevels[row.functional_role_code];
    const existingRank = existing ? (AUTHORITY_RANK[existing] ?? 0) : 0;
    const newRank = AUTHORITY_RANK[row.authority_level] ?? 0;
    if (newRank > existingRank) {
      authorityLevels[row.functional_role_code] = row.authority_level;
    }
  }

  const bundleResult = await safeQuery(
    `SELECT bundle_code FROM "${schema}".platform_role_tenant_role_map WHERE platform_role = $1 AND is_active = TRUE`,
    [platformRole],
  );
  const bundles = bundleResult.rows.map(( r: Record<string, unknown>) => r.bundle_code);

  let permissions: string[] = [];

  const permResult = await safeQuery(
    `SELECT DISTINCT p.code AS permission_code
     FROM "${schema}".enterprise_user_role_assignments eura
     JOIN "${schema}".functional_roles fr ON fr.code = eura.functional_role_code AND fr.is_active = TRUE
     JOIN "${schema}".role_permissions rp ON rp.functional_role_id = fr.id
     JOIN "${schema}".permissions p ON p.id = rp.permission_id
     WHERE eura.user_id = $1 AND eura.is_active = TRUE`,
    [userId],
  );
  permissions = permResult.rows.map(( r: Record<string, unknown>) => r.permission_code as string);

  if (accessProfileCode === 'platform_super_admin') {
    const allPermsResult = await safeQuery(
      `SELECT code, module_code FROM "${schema}".permissions WHERE is_active = TRUE`,
    );
    permissions = allPermsResult.rows.map(( r: Record<string, unknown>) => r.code as string);
    for (const row of allPermsResult.rows) {
      if (row.module_code) moduleCodes.add(row.module_code);
    }
  }

  return {
    user_id: userId,
    platform_role: platformRole,
    access_profile_code: accessProfileCode,
    bundles: bundles as string[],
    functional_roles: functionalRoles,
    permissions,
    module_codes: [...moduleCodes],
    authority_levels: authorityLevels,
  };
}

export async function deriveVisibleModules(tenantId: string, userId: string): Promise<string[]> {
  const chain = await deriveUserPermissions(tenantId, userId);
  const activeModules = await getActiveModuleCodes(tenantId);
  const visible = chain.module_codes.filter((m) => activeModules.includes(m));

  await logPolicyDecision(tenantId, {
    decision_type: 'visible_modules',
    user_id: userId,
    user_modules: chain.module_codes,
    active_modules: activeModules,
    visible,
  });

  return visible;
}

export async function deriveNavigation(
  tenantId: string,
  userId: string,
): Promise<{ visible_modules: string[]; landing_page: string; dashboard_widgets: string[] }> {
  const visibleModules = await deriveVisibleModules(tenantId, userId);

  const schema = tenantSchema(tenantId);
  const roleResult = await safeQuery(
    `SELECT role FROM "${schema}".users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  const role = roleResult.rows[0]?.role ?? 'user';

  const landingPage = ROLE_LANDING_PAGE[role] ?? (visibleModules.length > 0 ? `/${visibleModules[0]}/overview` : '/dashboard');
  const dashboardWidgets = visibleModules
    .map((m) => MODULE_WIDGETS[m])
    .filter(Boolean) as string[];

  return {
    visible_modules: visibleModules,
    landing_page: landingPage,
    dashboard_widgets: dashboardWidgets,
  };
}

export async function userHasPermission(
  tenantId: string,
  userId: string,
  permissionCode: string,
): Promise<boolean> {
  const chain = await deriveUserPermissions(tenantId, userId);
  return chain.permissions.includes(permissionCode);
}
