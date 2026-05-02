// Shahin — Module Security Seeder Service
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { logger } from '@dos/platform-core/observability';
/**
 * Module Security Seeder Service
 *
 * Seeds all 25 module security definitions (roles, permissions, actions,
 * SoD rules, approval matrices, and default field RBAC) into the tenant
 * schema tables created by migrations 408-415.
 *
 * All operations use upsert (ON CONFLICT DO UPDATE) so the seeder is
 * fully idempotent and safe to re-run.
 */

import { Pool, PoolClient } from 'pg';
import { tenantSchema } from '@dos/db';
import {
  MODULE_SECURITY_REGISTRY,
  getAllModuleCodes,
  type ModuleSecurityEntry,
  type ModuleRole,
  type ModulePermission,
  type ModuleAction,
  type SoDRule,
  type ApprovalRule,
} from './module-security-seeder.registry';

// ---------------------------------------------------------------------------
// Archetype-to-permission mapping for role_permission_map derivation.
// Defines which permission action types each archetype receives by default.
// ---------------------------------------------------------------------------
const ARCHETYPE_PERMISSION_ACTIONS: Record<string, string[]> = {
  executive_owner: ['read', 'write', 'delete', 'approve', 'manage'],
  module_lead:     ['read', 'write', 'delete', 'approve', 'manage'],
  approver:        ['read', 'approve'],
  operator:        ['read', 'write'],
  contributor:     ['read', 'write'],
  reviewer:        ['read'],
  auditor:         ['read'],
  viewer:          ['read'],
  external_party:  ['read'],
  ai_agent:        ['read', 'write'],
};

// ---------------------------------------------------------------------------
// Default field RBAC permission templates per archetype.
// Keys are the perm_* columns in field_rbac_permissions (migration 408).
// Values: 'rw' = read-write, 'r' = read-only, 'none' = hidden.
// ---------------------------------------------------------------------------
const DEFAULT_FIELD_PERMS: Record<string, string> = {
  perm_owner: 'rw',
  perm_admin: 'rw',
  perm_tenant_admin: 'rw',
  perm_compliance_officer: 'r',
  perm_risk_manager: 'r',
  perm_auditor: 'r',
  perm_viewer: 'r',
  perm_user: 'r',
  perm_manager: 'rw',
  perm_approver: 'r',
};

/**
 * Seed all module security data for a single tenant.
 *
 * @param tenantId - Tenant UUID (schema = tenant_{tenantId})
 * @param pool     - Shared PG connection pool
 * @returns Summary object with per-module counts and any errors
 */
export async function seedAllModuleSecurity(
  tenantId: string,
  pool: Pool,
): Promise<SeedResult> {
  const schema = tenantSchema(tenantId);
  const result: SeedResult = { modules: {}, errors: [] };
  const startTime = Date.now();

  const moduleCodes = getAllModuleCodes();
  logger.info(`[module-security-seeder] Starting security seed for tenant ${tenantId} (${moduleCodes.length} modules)`);

  for (const moduleCode of moduleCodes) {
    const entry = MODULE_SECURITY_REGISTRY.get(moduleCode);
    if (!entry) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL search_path TO "${schema}", public`);

      const counts = await seedSingleModule(tenantId, schema, entry, client);
      result.modules[moduleCode] = counts;

      await client.query('COMMIT');
      logger.info(
        `[module-security-seeder]   ${moduleCode}: ` +
        `${counts.roles}R ${counts.permissions}P ${counts.actions}A ` +
        `${counts.sod}S ${counts.approval}AM ${counts.rolePermMap}RPM ${counts.roleActionMap}RAM ${counts.fieldRbac}FR`,
      );
    } catch (err: unknown) {
      await client.query('ROLLBACK').catch(catchHandler(EC.EVENT_BUS, {}));
      const msg = `Module "${moduleCode}" failed: ${(err instanceof Error ? err.message : String(err))}`;
      logger.error(`[module-security-seeder]   ERROR ${msg}`);
      result.errors.push({ moduleCode, error: msg });
    } finally {
      client.release();
    }
  }

  const elapsed = Date.now() - startTime;
  logger.info(
    `[module-security-seeder] Completed in ${elapsed}ms. ` +
    `${Object.keys(result.modules).length} succeeded, ${result.errors.length} failed.`,
  );

  return result;
}

// ---------------------------------------------------------------------------
// Per-module seed logic
// ---------------------------------------------------------------------------

async function seedSingleModule(
  tenantId: string,
  schema: string,
  entry: ModuleSecurityEntry,
  client: PoolClient,
): Promise<ModuleSeedCounts> {
  const { moduleCode, roles, permissions, actions, sodRules: sod, approvalRules: approvalMatrix } = entry;

  // 1. Seed role definitions (migration 409)
  const rolesCount = await seedRoleDefinitions(tenantId, schema, moduleCode, roles, permissions, client);

  // 2. Seed permission definitions (migration 410)
  const permsCount = await seedPermissionDefinitions(tenantId, schema, moduleCode, permissions, client);

  // 3. Seed action definitions (migration 411)
  const actionsCount = await seedActionDefinitions(tenantId, schema, moduleCode, actions, client);

  // 4. Seed role-permission map (migration 412), derived from archetypes
  const rpmCount = await seedRolePermissionMap(tenantId, schema, moduleCode, roles, permissions, client);

  // 4b. Seed role-action map (migration 427), derived from archetypes × actions
  const ramCount = await seedRoleActionMap(tenantId, schema, moduleCode, roles, actions, client);

  // 5. Seed approval authority matrix (migration 413) — transition-based rules
  const approvalCount = await seedApprovalMatrix(tenantId, schema, moduleCode, approvalMatrix, client);

  // 5b. Seed approval_matrix_rules — action-based rules (DAuth checkActorAuthority reads these)
  const approvalRulesCount = await seedApprovalMatrixRules(tenantId, schema, moduleCode, approvalMatrix, client);

  // 6. Seed SoD rules into sod_conflict_matrix (baseline table — role-pair conflicts)
  const sodCount = await seedSoDRules(tenantId, schema, moduleCode, sod, client);

  // 6b. Seed module SoD action rules into module_sod_rules (action-pair conflicts)
  //     DAuth evaluateModuleSod() reads from {tenant_schema}.module_sod_rules
  const moduleSodCount = await seedModuleSodActionRules(tenantId, schema, moduleCode, sod, client);

  // 7. Seed default field RBAC permissions (migration 408)
  const fieldRbacCount = await seedDefaultFieldRbac(tenantId, schema, moduleCode, client);

  return {
    roles: rolesCount,
    permissions: permsCount,
    actions: actionsCount,
    rolePermMap: rpmCount,
    roleActionMap: ramCount,
    approval: approvalCount + approvalRulesCount,
    sod: sodCount + moduleSodCount,
    fieldRbac: fieldRbacCount,
  };
}

// ---------------------------------------------------------------------------
// 1. module_role_definitions (migration 409)
// ---------------------------------------------------------------------------

async function seedRoleDefinitions(
  tenantId: string,
  schema: string,
  moduleCode: string,
  roles: ModuleRole[],
  permissions: ModulePermission[],
  client: PoolClient,
): Promise<number> {
  if (!roles.length) return 0;

  const sql = `
    INSERT INTO "${schema}".module_role_definitions
      (tenant_id, module_code, role_code, archetype, name_en, name_ar,
       description_en, description_ar, permissions, is_default, is_system)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    ON CONFLICT (tenant_id, module_code, role_code) DO UPDATE SET
      archetype       = EXCLUDED.archetype,
      name_en         = EXCLUDED.name_en,
      name_ar         = EXCLUDED.name_ar,
      description_en  = EXCLUDED.description_en,
      description_ar  = EXCLUDED.description_ar,
      permissions     = EXCLUDED.permissions,
      is_default      = EXCLUDED.is_default,
      is_system       = EXCLUDED.is_system,
      updated_at      = NOW()
  `;

  let count = 0;
  for (const role of roles) {
    // Derive permissions JSONB from archetype mapping
    const allowedActions = ARCHETYPE_PERMISSION_ACTIONS[role.archetype] || ['read'];
    const rolePerms = permissions
      .filter((p) => allowedActions.includes(p.actionType))
      .map((p) => p.permissionCode);

    await client.query(sql, [
      tenantId,
      moduleCode,
      role.roleCode,
      role.archetype,
      role.nameEn,
      role.nameAr,
      role.descriptionEn,
      role.descriptionAr,
      JSON.stringify(rolePerms),
      role.isDefault,
      role.isSystem,
    ]);
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 2. module_permission_definitions (migration 410)
// ---------------------------------------------------------------------------

async function seedPermissionDefinitions(
  tenantId: string,
  schema: string,
  moduleCode: string,
  permissions: ModulePermission[],
  client: PoolClient,
): Promise<number> {
  if (!permissions.length) return 0;

  const sql = `
    INSERT INTO "${schema}".module_permission_definitions
      (tenant_id, module_code, permission_code, resource_type, action_type,
       description_en, description_ar, is_system)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    ON CONFLICT (tenant_id, module_code, permission_code) DO UPDATE SET
      resource_type  = EXCLUDED.resource_type,
      action_type    = EXCLUDED.action_type,
      description_en = EXCLUDED.description_en,
      description_ar = EXCLUDED.description_ar,
      updated_at     = NOW()
  `;

  let count = 0;
  for (const perm of permissions) {
    await client.query(sql, [
      tenantId,
      moduleCode,
      perm.permissionCode,
      perm.resourceType,
      perm.actionType,
      perm.descriptionEn,
      perm.descriptionAr,
    ]);
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 3. module_action_definitions (migration 411)
// ---------------------------------------------------------------------------

async function seedActionDefinitions(
  tenantId: string,
  schema: string,
  moduleCode: string,
  actions: ModuleAction[],
  client: PoolClient,
): Promise<number> {
  if (!actions.length) return 0;

  const sql = `
    INSERT INTO "${schema}".module_action_definitions
      (tenant_id, module_code, action_code, name_en, name_ar,
       required_permissions, sod_sensitive, ai_enabled, danger_level)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (tenant_id, module_code, action_code) DO UPDATE SET
      name_en              = EXCLUDED.name_en,
      name_ar              = EXCLUDED.name_ar,
      required_permissions = EXCLUDED.required_permissions,
      sod_sensitive        = EXCLUDED.sod_sensitive,
      ai_enabled           = EXCLUDED.ai_enabled,
      danger_level         = EXCLUDED.danger_level,
      updated_at           = NOW()
  `;

  let count = 0;
  for (const action of actions) {
    await client.query(sql, [
      tenantId,
      moduleCode,
      action.actionCode,
      action.labelEn,
      action.labelAr,
      JSON.stringify(action.requiredPermissions),
      action.sodSensitive,
      action.aiEnabled,
      action.dangerLevel,
    ]);
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 4. role_permission_map (migration 412) -- derived from roles x permissions
// ---------------------------------------------------------------------------

async function seedRolePermissionMap(
  tenantId: string,
  schema: string,
  moduleCode: string,
  roles: ModuleRole[],
  permissions: ModulePermission[],
  client: PoolClient,
): Promise<number> {
  if (!roles.length || !permissions.length) return 0;

  const sql = `
    INSERT INTO "${schema}".role_permission_map
      (tenant_id, role_code, permission_code, module_code, granted_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (tenant_id, role_code, permission_code, module_code) DO UPDATE SET
      granted_at = NOW()
  `;

  let count = 0;
  for (const role of roles) {
    const allowedActions = ARCHETYPE_PERMISSION_ACTIONS[role.archetype] || ['read'];
    const grantedPerms = permissions.filter((p) => allowedActions.includes(p.actionType));

    for (const perm of grantedPerms) {
      await client.query(sql, [tenantId, role.roleCode, perm.permissionCode, moduleCode]);
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 4b. role_action_map (migration 427) -- derived from roles x actions
// ---------------------------------------------------------------------------

async function seedRoleActionMap(
  tenantId: string,
  schema: string,
  moduleCode: string,
  roles: ModuleRole[],
  actions: ModuleAction[],
  client: PoolClient,
): Promise<number> {
  if (!roles.length || !actions.length) return 0;

  const sql = `
    INSERT INTO "${schema}".role_action_map
      (tenant_id, role_code, action_code, module_code, granted_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (tenant_id, role_code, action_code, module_code) DO UPDATE SET
      granted_at = NOW()
  `;

  let count = 0;
  for (const role of roles) {
    const allowedActions = ARCHETYPE_PERMISSION_ACTIONS[role.archetype] || ['read'];
    // Grant action to role if ALL of the action's required permissions
    // match the archetype's allowed action types
    const grantedActions = actions.filter((a) => {
      if (!a.requiredPermissions.length) return allowedActions.includes('read');
      return a.requiredPermissions.every((perm) => {
        const actionType = perm.split(':').pop() || 'read';
        return allowedActions.includes(actionType);
      });
    });

    for (const action of grantedActions) {
      await client.query(sql, [tenantId, role.roleCode, action.actionCode, moduleCode]);
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// 5. approval_authority_matrix (migration 413)
// ---------------------------------------------------------------------------

async function seedApprovalMatrix(
  tenantId: string,
  schema: string,
  moduleCode: string,
  matrix: ApprovalRule[],
  client: PoolClient,
): Promise<number> {
  if (!matrix.length) return 0;

  const sql = `
    INSERT INTO "${schema}".approval_authority_matrix
      (tenant_id, module_code, entity_type, from_status, to_status,
       required_roles, required_permissions)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (tenant_id, module_code, entity_type, from_status, to_status) DO UPDATE SET
      required_roles       = EXCLUDED.required_roles,
      required_permissions = EXCLUDED.required_permissions,
      updated_at           = NOW()
  `;

  let count = 0;
  for (const rule of matrix) {
    await client.query(sql, [
      tenantId,
      moduleCode,
      rule.entityType,
      rule.fromStatus,
      rule.toStatus,
      JSON.stringify([rule.requiredRole]),
      JSON.stringify([]),
    ]);
    count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 5b. approval_matrix_rules (action-based rules for DAuth checkActorAuthority)
// ---------------------------------------------------------------------------

async function seedApprovalMatrixRules(
  tenantId: string,
  schema: string,
  moduleCode: string,
  matrix: ApprovalRule[],
  client: PoolClient,
): Promise<number> {
  if (!matrix.length) return 0;

  // Ensure table exists in tenant schema (idempotent)
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".approval_matrix_rules (
      rule_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action_code             TEXT,
      module_code             TEXT NOT NULL,
      required_authority_code TEXT NOT NULL DEFAULT 'module_admin',
      min_approvals           INT DEFAULT 1,
      value_threshold         NUMERIC,
      is_active               BOOLEAN NOT NULL DEFAULT TRUE,
      created_by              TEXT,
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  let count = 0;
  for (const rule of matrix) {
    // Derive action_code from module + transition (e.g., onboarding.approved_for_provisioning)
    const actionCode = `${moduleCode}.${rule.toStatus}`;

    await client.query(
      `INSERT INTO "${schema}".approval_matrix_rules
         (action_code, module_code, required_authority_code, min_approvals, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
       ON CONFLICT (rule_id) DO NOTHING`,
      [actionCode, moduleCode, rule.requiredRole || 'module_admin', rule.minApprovers ?? 1],
    );
    count++;
  }

  if (count > 0) {
    logger.info('[SecuritySeeder] Approval matrix rules seeded', { moduleCode, count });
  }
  return count;
}

// ---------------------------------------------------------------------------
// 6b. module_sod_rules (action-pair conflicts for DAuth evaluateModuleSod)
// ---------------------------------------------------------------------------

async function seedModuleSodActionRules(
  tenantId: string,
  schema: string,
  moduleCode: string,
  rules: SoDRule[],
  client: PoolClient,
): Promise<number> {
  if (!rules.length) return 0;

  // Ensure table exists in tenant schema (idempotent)
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".module_sod_rules (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      module_code         TEXT NOT NULL,
      action_a            TEXT NOT NULL,
      action_b            TEXT NOT NULL,
      conflict_type       TEXT NOT NULL DEFAULT 'hard',
      resolution_strategy TEXT NOT NULL DEFAULT 'escalate',
      description_en      TEXT,
      description_ar      TEXT,
      severity            TEXT DEFAULT 'high',
      delegate_to_role    TEXT,
      escalation_roles    TEXT[] DEFAULT '{}',
      deadline_hours      INT DEFAULT 48,
      active              BOOLEAN NOT NULL DEFAULT TRUE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(module_code, action_a, action_b)
    )
  `);

  // Delete existing rules for this module (idempotent re-seed)
  await client.query(
    `DELETE FROM "${schema}".module_sod_rules WHERE module_code = $1`,
    [moduleCode],
  );

  let count = 0;
  for (const rule of rules) {
    const actions = rule.conflictingActions;
    if (actions.length < 2) continue;

    // Generate all action pairs
    for (let i = 0; i < actions.length; i++) {
      for (let j = i + 1; j < actions.length; j++) {
        await client.query(
          `INSERT INTO "${schema}".module_sod_rules
             (module_code, action_a, action_b, conflict_type, resolution_strategy,
              description_en, description_ar, severity, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
           ON CONFLICT (module_code, action_a, action_b) DO UPDATE SET
             conflict_type = EXCLUDED.conflict_type,
             resolution_strategy = EXCLUDED.resolution_strategy,
             description_en = EXCLUDED.description_en,
             severity = EXCLUDED.severity,
             active = TRUE,
             updated_at = NOW()`,
          [
            moduleCode,
            actions[i],
            actions[j],
            rule.enforcement === 'hard_block' ? 'hard' : 'soft',
            rule.enforcement === 'hard_block' ? 'block' : 'escalate',
            `[${rule.ruleCode}] ${rule.descriptionEn}`,
            rule.descriptionAr,
            rule.severity,
          ],
        );
        count++;
      }
    }
  }

  if (count > 0) {
    logger.info('[SecuritySeeder] Module SoD action rules seeded', { moduleCode, count });
  }
  return count;
}

// ---------------------------------------------------------------------------
// 6. sod_conflict_matrix (baseline table)
// ---------------------------------------------------------------------------

async function seedSoDRules(
  tenantId: string,
  schema: string,
  moduleCode: string,
  rules: SoDRule[],
  client: PoolClient,
): Promise<number> {
  if (!rules.length) return 0;

  // sod_conflict_matrix PK is conflict_id (uuid), unique constraint is not
  // defined on (role_a, role_b). We use a rule_code-based approach: delete
  // existing entries for this module's rule codes, then re-insert.
  // This keeps the operation idempotent.
  const _existingRuleCodes = rules.map((r) => r.ruleCode);
  await client.query(
    `DELETE FROM "${schema}".sod_conflict_matrix
     WHERE scope = $1`,
    [`module:${moduleCode}`],
  );

  const sql = `
    INSERT INTO "${schema}".sod_conflict_matrix
      (role_a, role_b, scope, reason_en, reason_ar, severity, active)
    VALUES ($1, $2, $3, $4, $5, $6, true)
  `;

  let count = 0;
  for (const rule of rules) {
    // Each SoD rule may specify multiple conflicting role pairs.
    // Generate cross-product pairs from conflictingRoles where applicable.
    const roles = rule.conflictingRoles;
    if (roles.length >= 2) {
      // Create pairs for all combinations
      for (let i = 0; i < roles.length; i++) {
        for (let j = i + 1; j < roles.length; j++) {
          await client.query(sql, [
            roles[i],
            roles[j],
            `module:${moduleCode}`,
            `[${rule.ruleCode}] ${rule.descriptionEn}`,
            rule.descriptionAr,
            mapSoDSeverity(rule.severity),
          ]);
          count++;
        }
      }
    } else if (roles.length === 1 && rule.conflictingActions.length >= 2) {
      // Single role with conflicting actions -- insert as self-conflict
      await client.query(sql, [
        roles[0],
        roles[0],
        `module:${moduleCode}`,
        `[${rule.ruleCode}] ${rule.descriptionEn}`,
        rule.descriptionAr,
        mapSoDSeverity(rule.severity),
      ]);
      count++;
    }
  }
  return count;
}

/** Map module SoD severity to sod_conflict_matrix severity values */
function mapSoDSeverity(severity: string): string {
  switch (severity) {
    case 'critical': return 'hard';
    case 'high':     return 'hard';
    case 'medium':   return 'soft';
    default:         return 'soft';
  }
}

// ---------------------------------------------------------------------------
// 7. field_rbac_permissions (migration 408) -- default field-level perms
// ---------------------------------------------------------------------------

/** Canonical entity types per module for default field RBAC seed */
const MODULE_ENTITY_TYPES: Record<string, string[]> = {
  risk:           ['risk', 'assessment', 'treatment', 'kri'],
  compliance:     ['control', 'assessment', 'attestation', 'framework'],
  governance:     ['committee', 'meeting', 'resolution', 'charter'],
  policy:         ['policy', 'version', 'acknowledgment'],
  evidence:       ['evidence', 'request', 'schedule'],
  audit:          ['audit', 'finding', 'workpaper', 'engagement'],
  incident:       ['incident', 'response', 'investigation'],
  vendor:         ['vendor', 'assessment', 'contract'],
  bcp:            ['plan', 'test', 'scenario', 'impact_analysis'],
  asset:          ['asset', 'classification', 'inventory'],
  exception:      ['exception', 'request', 'approval'],
  remediation:    ['remediation', 'action', 'tracking'],
  action:         ['action_item', 'assignment', 'tracking'],
  training:       ['course', 'enrollment', 'completion'],
  workflow:       ['workflow', 'instance', 'step'],
  foundation:     ['organization', 'department', 'position'],
  reporting:      ['report', 'template', 'schedule'],
  ai:             ['model', 'prompt', 'response', 'agent'],
  qiyas:          ['question', 'assessment', 'benchmark'],
  'ai-governance': ['model_registry', 'bias_assessment', 'explainability'],
  integrations:   ['integration', 'connection', 'mapping'],
  notification:   ['notification', 'template', 'channel'],
  analytics:      ['dashboard', 'metric', 'kpi'],
  team:           ['team', 'member', 'assignment'],
  admin:          ['tenant', 'user', 'configuration'],
};

/** Default fields that every entity type gets RBAC entries for */
const DEFAULT_FIELDS = ['id', 'name', 'status', 'description', 'created_at', 'updated_at', 'owner_id'];

async function seedDefaultFieldRbac(
  tenantId: string,
  schema: string,
  moduleCode: string,
  client: PoolClient,
): Promise<number> {
  const entityTypes = MODULE_ENTITY_TYPES[moduleCode] || [];
  if (!entityTypes.length) return 0;

  const permColumns = Object.keys(DEFAULT_FIELD_PERMS);
  const permPlaceholders = permColumns.map((_, i) => `$${i + 5}`).join(', ');
  const permValues = Object.values(DEFAULT_FIELD_PERMS);
  const permUpdateClauses = permColumns.map((col) => `${col} = EXCLUDED.${col}`).join(', ');

  const sql = `
    INSERT INTO "${schema}".field_rbac_permissions
      (tenant_id, module_code, entity_type, field_name, ${permColumns.join(', ')})
    VALUES ($1, $2, $3, $4, ${permPlaceholders})
    ON CONFLICT (tenant_id, module_code, entity_type, field_name) DO UPDATE SET
      ${permUpdateClauses},
      updated_at = NOW()
  `;

  let count = 0;
  for (const entityType of entityTypes) {
    for (const field of DEFAULT_FIELDS) {
      await client.query(sql, [tenantId, moduleCode, entityType, field, ...permValues]);
      count++;
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleSeedCounts {
  roles: number;
  permissions: number;
  actions: number;
  rolePermMap: number;
  roleActionMap: number;
  approval: number;
  sod: number;
  fieldRbac: number;
}

export interface SeedResult {
  modules: Record<string, ModuleSeedCounts>;
  errors: Array<{ moduleCode: string; error: string }>;
}
