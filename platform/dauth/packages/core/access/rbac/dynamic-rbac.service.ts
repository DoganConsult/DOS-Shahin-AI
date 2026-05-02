// ============================================
// DAuth — Dynamic RBAC Service
// Determines which roles/permissions are active based on
// tenant module entitlements. Roles tied to disabled modules
// become inactive. Data-driven security (Law 3).
// Owner: DAuth
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';

// ── Types ──────────────────────────────────────────────────────────

export interface ActivationRule {
  roleCode: string;
  moduleCode: string;
  active: boolean;
  reason: string;
}

export interface EffectivePermission {
  permissionCode: string;
  module: string;
  active: boolean;
}

// ── Module → Role registry ─────────────────────────────────────────
// Maps module codes to the role codes that require that module.
// Platform/tenant-tier roles are always active regardless of modules.

const ALWAYS_ACTIVE_TIERS = new Set(['platform', 'tenant']);

const MODULE_ROLE_MAP: Record<string, string[]> = {
  compliance: ['compliance_officer'],
  risk: ['risk_manager'],
  audit: ['auditor'],
  policy: ['policy_owner'],
  incident: ['incident_manager'],
  vendor: ['vendor_manager'],
  workflow: ['workflow_admin'],
};

// ── Activation Rules ───────────────────────────────────────────────

/**
 * Returns the activation state of every role in the tenant schema,
 * resolving against the tenant's module entitlements.
 *
 * Rules:
 *  - Platform-tier and tenant-tier roles are always active.
 *  - Module-tier roles are active only if their associated module is enabled.
 *  - Roles not linked to any module default to active.
 */
export async function getActivationRules(tenantId: string): Promise<ActivationRule[]> {
  const ts = tenantSchema(tenantId);
  const rules: ActivationRule[] = [];

  try {
    // ── 1. Load all roles ───────────────────────────────────────
    const rolesResult = await safeQuery(
      `SELECT code, name, tier FROM ${ts}.roles WHERE is_active = true ORDER BY code`,
    );

    if (rolesResult.rows.length === 0) {
      // Fallback: try functional_roles table name
      const altResult = await safeQuery(
        `SELECT code, name, tier FROM ${ts}.functional_roles WHERE is_active = true ORDER BY code`,
      );
      if (altResult.rows.length === 0) return [];
      rolesResult.rows.push(...altResult.rows);
    }

    // ── 2. Load enabled modules ─────────────────────────────────
    const entitlementsResult = await safeQuery(
      `SELECT module_code, is_enabled
       FROM ${ts}.tenant_module_entitlements
       WHERE is_enabled = true`,
    );
    const enabledModules = new Set(
      entitlementsResult.rows.map((r: any) => r.module_code),
    );

    // ── 3. Build inverse map: role → module ─────────────────────
    const roleToModule: Record<string, string> = {};
    for (const [mod, roleCodes] of Object.entries(MODULE_ROLE_MAP)) {
      for (const rc of roleCodes) {
        roleToModule[rc] = mod;
      }
    }

    // ── 4. Evaluate each role ───────────────────────────────────
    for (const roleRow of rolesResult.rows) {
      const role: any = roleRow;
      const tier = role.tier ?? 'module';
      const linkedModule = roleToModule[role.code];

      if (ALWAYS_ACTIVE_TIERS.has(tier)) {
        rules.push({
          roleCode: role.code,
          moduleCode: 'platform',
          active: true,
          reason: `${tier}-tier role — always active`,
        });
        continue;
      }

      if (!linkedModule) {
        // Module-tier role with no known module link — treat as active
        rules.push({
          roleCode: role.code,
          moduleCode: 'unlinked',
          active: true,
          reason: 'Role not linked to a specific module — defaults to active',
        });
        continue;
      }

      const moduleEnabled = enabledModules.has(linkedModule);
      rules.push({
        roleCode: role.code,
        moduleCode: linkedModule,
        active: moduleEnabled,
        reason: moduleEnabled
          ? `Module "${linkedModule}" is enabled`
          : `Module "${linkedModule}" is not enabled — role deactivated`,
      });
    }

    return rules;
  } catch {
    return [];
  }
}

// ── Effective Permissions ──────────────────────────────────────────

/**
 * Returns the effective permissions for a user, filtered by module
 * activation status. Permissions linked to disabled modules are
 * excluded even if the user holds them via role assignment.
 */
export async function getEffectivePermissions(
  tenantId: string,
  userId: string,
): Promise<EffectivePermission[]> {
  const ts = tenantSchema(tenantId);

  try {
    // Get enabled modules
    const entResult = await safeQuery(
      `SELECT module_code FROM ${ts}.tenant_module_entitlements WHERE is_enabled = true`,
    );
    const enabledModules = new Set(
      entResult.rows.map((r: any) => r.module_code),
    );
    // Platform/dauth modules are always enabled
    enabledModules.add('platform');
    enabledModules.add('dauth');

    // Get user's permissions via roles
    const permResult = await safeQuery(
      `SELECT DISTINCT p.code AS permission_code, p.module
       FROM ${ts}.user_role_assignments ura
       JOIN ${ts}.roles r ON r.id = ura.role_id
       JOIN ${ts}.role_permissions rp ON rp.role_id = r.id
       JOIN ${ts}.permissions p ON p.id = rp.permission_id
       WHERE ura.user_id = $1
         AND ura.is_active = true
         AND (ura.valid_until IS NULL OR ura.valid_until > NOW())
       ORDER BY p.code`,
      [userId],
    );

    return permResult.rows.map((r: any) => ({
      permissionCode: r.permission_code,
      module: r.module,
      active: enabledModules.has(r.module),
    }));
  } catch {
    return [];
  }
}

// ── Active roles for user ──────────────────────────────────────────

/**
 * Returns the list of role codes that are both assigned to the user
 * AND active per module entitlements.
 */
export async function getActiveRolesForUser(
  tenantId: string,
  userId: string,
): Promise<string[]> {
  const activationRules = await getActivationRules(tenantId);
  const activeRoleCodes = new Set(
    activationRules.filter(r => r.active).map(r => r.roleCode),
  );

  const ts = tenantSchema(tenantId);
  const assigned = await safeQuery(
    `SELECT r.code
     FROM ${ts}.user_role_assignments ura
     JOIN ${ts}.roles r ON r.id = ura.role_id
     WHERE ura.user_id = $1
       AND ura.is_active = true
       AND (ura.valid_until IS NULL OR ura.valid_until > NOW())`,
    [userId],
  );

  return assigned.rows
    .map((r: any) => r.code)
    .filter((code: string) => activeRoleCodes.has(code));
}
