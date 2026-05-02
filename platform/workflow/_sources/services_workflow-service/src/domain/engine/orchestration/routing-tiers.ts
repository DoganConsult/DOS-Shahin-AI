// ============================================
// Process Orchestration — 5-Tier Routing Resolution
// Each tier attempts to resolve a task assignee:
//   T0: Explicit assigneeRole hint
//   T1: Record ownership (owner/reviewer/approver)
//   T2: Enterprise authz (functional roles + authority + SoD)
//   T3: Dynamic RACI matrix lookup
//   T4: Hardcoded fallback map (last resort)
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
type ScopeType = 'tenant' | 'organization' | 'department' | 'team' | 'position' | 'process' | 'policy' | 'workflow';

async function resolveRACIAssignee(tenantId: string, scopeType: ScopeType, scopeId: string, raciRole: string): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT tra.user_id
       FROM "${schema}".team_raci_assignments tra
       JOIN public.users u ON u.user_id = tra.user_id AND u.status = 'active'
       WHERE tra.scope_type = $1 AND tra.scope_id = $2 AND tra.raci_role = $3
       ORDER BY (
         SELECT COUNT(*) FROM "${schema}".process_tasks pt
         WHERE pt.assigned_user_id = tra.user_id AND pt.status NOT IN ('completed','cancelled','auto_closed')
       ) ASC
       LIMIT 1`,
      [scopeType, scopeId, raciRole],
    );
    return result.rows.length > 0 ? result.rows[0].user_id : null;
  } catch {
    return null;
  }
}

async function distributeTask(tenantId: string, teamId: string, _context: string): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT tm.user_id
       FROM "${schema}".team_members tm
       JOIN public.users u ON u.user_id = tm.user_id AND u.status = 'active'
       WHERE tm.team_id = $1 AND tm.active = TRUE
       ORDER BY (
         SELECT COUNT(*) FROM "${schema}".process_tasks pt
         WHERE pt.assigned_user_id = tm.user_id AND pt.status NOT IN ('completed','cancelled','auto_closed')
       ) ASC
       LIMIT 1`,
      [teamId],
    );
    return result.rows.length > 0 ? result.rows[0].user_id : null;
  } catch {
    return null;
  }
}

import { runFindEligibleAssignees } from '../contracts/task-hooks.contract';
import { getFirstRow } from '@dos/db';

import { toErrorMessage } from '@dos/platform-core/resilience';

import type { ProcessTaskType, RoutingResolution } from './types';
import { EMPTY_RESOLUTION, TASK_PRIORITY_TO_MIN_AUTHORITY } from './types';
import { tableExists, getTaskTypePermissionAction } from './schema-introspection';
import { getEntityModule, getEntityTable, getFallbackDomain } from './entity-descriptor-wrappers';
import { swallowNull, EC } from '@dos/platform-core/resilience';

// ── Tier 0: Explicit Role Hint ───────────────────────────────────────────────

export async function resolveByRoleHint(
  tenantId: string,
  role: string,
): Promise<RoutingResolution> {
  const schema = tenantSchema(tenantId);

  // Try enterprise authz first: find users with this functional_role_code
  try {
    if (await tableExists(schema, 'enterprise_user_role_assignments')) {
      const res = await safeQuery(
        `SELECT ura.user_id, tm.team_id
         FROM "${schema}".enterprise_user_role_assignments ura
         JOIN public.users u ON u.user_id = ura.user_id AND u.status = 'active'
         LEFT JOIN "${schema}".team_members tm ON tm.user_id = ura.user_id AND tm.active = TRUE
         WHERE ura.functional_role_code = $1 AND ura.is_active = TRUE
           AND (ura.valid_to IS NULL OR ura.valid_to > NOW())
           AND u.tenant_id = $2
         ORDER BY (
           SELECT COUNT(*) FROM "${schema}".process_tasks pt
           WHERE pt.assigned_user_id = ura.user_id AND pt.status NOT IN ('completed','cancelled','auto_closed')
         ) ASC
         LIMIT 1`,
        [role, tenantId],
      );
      if (res.rows.length > 0) {
        return {
          teamId: getFirstRow(res)?.team_id ?? null,
          assignedUserId: getFirstRow(res)?.user_id,
          scopeType: null, scopeId: null,
          tier: 'T0:enterprise_role',
          metadata: { functionalRoleCode: role },
        };
      }
    }
  } catch {
    // enterprise tables may not exist — fall through to legacy
  }

  // Fallback: legacy role field on public.users
  try {
    const res = await safeQuery(
      `SELECT u.user_id, tm.team_id
       FROM public.users u
       LEFT JOIN "${schema}".team_members tm ON tm.user_id = u.user_id AND tm.active = TRUE
       WHERE u.tenant_id = $1 AND u.role = $2 AND u.status = 'active'
       ORDER BY (
         SELECT COUNT(*) FROM "${schema}".process_tasks pt
         WHERE pt.assigned_user_id = u.user_id AND pt.status NOT IN ('completed','cancelled','auto_closed')
       ) ASC
       LIMIT 1`,
      [tenantId, role],
    );
    if (res.rows.length > 0) {
      return {
        teamId: getFirstRow(res)?.team_id ?? null,
        assignedUserId: getFirstRow(res)?.user_id,
        scopeType: null, scopeId: null,
        tier: 'T0:legacy_role',
        metadata: { legacyRole: role },
      };
    }
  } catch {
    // not critical
  }

  return { ...EMPTY_RESOLUTION, tier: 'T0:miss' };
}

// ── Tier 1: Record Ownership ─────────────────────────────────────────────────

export async function resolveByRecordOwnership(
  tenantId: string,
  entityType: string,
  entityId: string,
  taskType: ProcessTaskType,
): Promise<RoutingResolution> {
  const mapping = getEntityTable(entityType);
  if (!mapping) return { ...EMPTY_RESOLUTION, tier: 'T1:no_table_map' };

  const schema = tenantSchema(tenantId);

  // Determine which owner column to use based on task type
  let targetCol = mapping.ownerCol;
  if ((taskType === 'control_review' || taskType === 'verification') && mapping.reviewerCol) {
    targetCol = mapping.reviewerCol;
  } else if (taskType === 'approval' && mapping.approverCol) {
    targetCol = mapping.approverCol;
  }

  const orgUnitSelect = mapping.orgUnitCol ? `, ${mapping.orgUnitCol}` : '';

  try {
    const res = await safeQuery(
      `SELECT ${targetCol} AS target_user_id${orgUnitSelect}
       FROM "${schema}".${mapping.table}
       WHERE ${mapping.pk} = $1
       LIMIT 1`,
      [entityId],
    );

    if (!res.rows.length || !getFirstRow(res)?.target_user_id) {
      return { ...EMPTY_RESOLUTION, tier: 'T1:no_owner' };
    }

    const targetUserId = getFirstRow(res)?.target_user_id;
    const orgUnitId = mapping.orgUnitCol ? getFirstRow(res)[mapping.orgUnitCol] : null;

    // Verify the user is active
    const userRes = await safeQuery(
      `SELECT user_id FROM public.users WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [targetUserId],
    );
    if (!userRes.rows.length) {
      return { ...EMPTY_RESOLUTION, tier: 'T1:owner_inactive', metadata: { targetUserId }, orgUnitId };
    }

    // Get their team membership
    const tmRes = await safeQuery(
      `SELECT team_id FROM "${schema}".team_members WHERE user_id = $1 AND active = TRUE LIMIT 1`,
      [targetUserId],
    );

    return {
      teamId: getFirstRow(tmRes)?.team_id ?? null,
      assignedUserId: targetUserId,
      scopeType: null, scopeId: null,
      orgUnitId,
      tier: 'T1:record_owner',
      metadata: { entityType, entityId, column: targetCol, orgUnitId },
    };
  } catch {
    return { ...EMPTY_RESOLUTION, tier: 'T1:error' };
  }
}

// ── Tier 2: Enterprise Authorization ─────────────────────────────────────────

export async function resolveByEnterpriseAuthz(
  tenantId: string,
  entityType: string,
  taskType: ProcessTaskType,
  priority: string,
  orgUnitId?: string | null,
): Promise<RoutingResolution> {
  const schema = tenantSchema(tenantId);

  // Check if enterprise authz tables exist
  if (!await tableExists(schema, 'enterprise_user_role_assignments')) {
    return { ...EMPTY_RESOLUTION, tier: 'T2:no_tables' };
  }

  const moduleCode = getEntityModule(entityType);
  if (!moduleCode) return { ...EMPTY_RESOLUTION, tier: 'T2:no_module_map' };

  const actionSuffix = await getTaskTypePermissionAction(tenantId, taskType);
  const permissionCode = `${moduleCode}.${actionSuffix}`;

  // Authority level gating only for approval/verification tasks
  const needsAuthority = taskType === 'approval' || taskType === 'verification';
  let minAuthorityLevel: string | undefined;
  if (needsAuthority) {
    // Try DB-driven sla_priority_config first, fall back to hardcoded
    try {
      const authRes = await safeQuery(
        `SELECT min_authority_level FROM "${tenantSchema(tenantId)}".sla_priority_config WHERE priority_level = $1 LIMIT 1`,
        [priority],
      );
      minAuthorityLevel = getFirstRow(authRes)?.min_authority_level || TASK_PRIORITY_TO_MIN_AUTHORITY[priority];
    } catch {
      minAuthorityLevel = TASK_PRIORITY_TO_MIN_AUTHORITY[priority];
    }
  }

  try {
    const candidates = await runFindEligibleAssignees(
      tenantId,
      moduleCode,
      permissionCode,
      {
        scopeType: orgUnitId ? 'org_unit' : undefined,
        scopeId: orgUnitId ? Number(orgUnitId) : undefined,
        minAuthorityLevel,
        includeDelegations: true,
        limit: 3,
      },
    );

    if (candidates.length === 0) {
      return { ...EMPTY_RESOLUTION, tier: 'T2:no_eligible' };
    }

    const best = candidates[0];
    return {
      teamId: best.teamId!,
      assignedUserId: best.userId,
      scopeType: best.scopeType as ScopeType ?? null,
      scopeId: best.scopeId ? String(best.scopeId) : null,
      tier: `T2:enterprise_authz${best.isDelegated ? ':delegated' : ''}`,
      metadata: {
        moduleCode,
        permissionCode,
        functionalRoleCode: best.functionalRoleCode,
        authorityLevel: best.authorityLevel,
        isDelegated: best.isDelegated,
        candidateCount: candidates.length,
        openTasks: best.openTasks,
      },
    };
  } catch (e: unknown) {
    return { ...EMPTY_RESOLUTION, tier: 'T2:error', metadata: { error: toErrorMessage(e) } };
  }
}

// ── Tier 3: Dynamic RACI Matrix ──────────────────────────────────────────────

export async function resolveByDynamicRACI(
  tenantId: string,
  entityType: string,
  entityId?: string,
): Promise<RoutingResolution> {
  const schema = tenantSchema(tenantId);

  // First try DB-driven routing config (tenant-customizable)
  let domainCode: string | null = null;
  let fallbackTeamCode: string | null = null;
  try {
    if (await tableExists(schema, 'entity_type_routing_config')) {
      const cfgRes = await safeQuery(
        `SELECT domain_code, default_team_code FROM "${schema}".entity_type_routing_config
         WHERE entity_type = $1 AND active = TRUE LIMIT 1`,
        [entityType],
      );
      if (cfgRes.rows.length > 0) {
        domainCode = getFirstRow(cfgRes)?.domain_code;
        fallbackTeamCode = getFirstRow(cfgRes)?.default_team_code;
      }
    }
  } catch {
    // table may not exist
  }

  // If no DB config, derive domain_code from entity type
  if (!domainCode) {
    const mapping = getFallbackDomain(entityType);
    if (mapping) {
      domainCode = mapping.scopeId;
    }
  }

  if (!domainCode) return { ...EMPTY_RESOLUTION, tier: 'T3:no_domain' };

  // Try exact entity RACI match (for policy/workflow entities)
  if (entityId && (entityType === 'policy' || entityType === 'workflow')) {
    try {
      const userId = await resolveRACIAssignee(tenantId, entityType as ScopeType, entityId, 'responsible');
      if (userId) {
        const tmRes = await safeQuery(
          `SELECT team_id FROM "${schema}".team_raci_assignments
           WHERE scope_type = $1 AND scope_id = $2 AND raci_role = 'responsible' AND team_id IS NOT NULL LIMIT 1`,
          [entityType, entityId],
        );
        return {
          teamId: getFirstRow(tmRes)?.team_id ?? null,
          assignedUserId: userId,
          scopeType: entityType as ScopeType,
          scopeId: entityId,
          tier: 'T3:raci_exact',
          metadata: { entityType, entityId },
        };
      }
    } catch {
      // exact RACI not available
    }
  }

  // Try raci_matrix by domain_code → get responsible teams
  try {
    if (await tableExists(schema, 'raci_matrix')) {
      const raciRes = await safeQuery(
        `SELECT responsible_role_codes, scope_type, scope_id
         FROM "${schema}".raci_matrix
         WHERE domain_code = $1 AND active = true
         ORDER BY created_at DESC LIMIT 1`,
        [entityType === 'governance_action' ? 'governance' :
         entityType === 'committee' ? 'governance' :
         entityType === 'procedure' ? 'governance' :
         entityType === 'mandate' ? 'governance' :
         entityType === 'enforcement_violation' ? 'governance' :
         entityType],
      );

      if (raciRes.rows.length > 0) {
        const row = getFirstRow(raciRes);
        const raciScopeType: ScopeType = row.scope_type || 'process';
        const raciScopeId: string = row.scope_id || domainCode;

        // Try resolving via RACI team assignments
        const userId = await resolveRACIAssignee(tenantId, raciScopeType, raciScopeId, 'responsible');
        if (userId) {
          const tmRes = await safeQuery(
            `SELECT team_id FROM "${schema}".team_raci_assignments
             WHERE scope_type = $1 AND scope_id = $2 AND raci_role = 'responsible' AND team_id IS NOT NULL LIMIT 1`,
            [raciScopeType, raciScopeId],
          );
          return {
            teamId: getFirstRow(tmRes)?.team_id ?? null,
            assignedUserId: userId,
            scopeType: raciScopeType,
            scopeId: raciScopeId,
            tier: 'T3:raci_matrix',
            metadata: { domainCode, raciScopeType, raciScopeId },
          };
        }
      }
    }
  } catch {
    // raci_matrix may not exist
  }

  // Try process-level RACI with the domain code as scope_id
  try {
    const userId = await resolveRACIAssignee(tenantId, 'process' as ScopeType, domainCode, 'responsible');
    if (userId) {
      const tmRes = await safeQuery(
        `SELECT team_id FROM "${schema}".team_raci_assignments
         WHERE scope_type = 'process' AND scope_id = $1 AND raci_role = 'responsible' AND team_id IS NOT NULL LIMIT 1`,
        [domainCode],
      );
      return {
        teamId: getFirstRow(tmRes)?.team_id ?? null,
        assignedUserId: userId,
        scopeType: 'process' as ScopeType,
        scopeId: domainCode,
        tier: 'T3:raci_process',
        metadata: { domainCode },
      };
    }
  } catch {
    // RACI resolution failed
  }

  return { ...EMPTY_RESOLUTION, tier: 'T3:miss', metadata: { domainCode, fallbackTeamCode } };
}

// ── Tier 4: Hardcoded Fallback Map ───────────────────────────────────────────

export async function resolveByFallbackMap(
  tenantId: string,
  entityType?: string,
): Promise<RoutingResolution> {
  const mapping = entityType ? getFallbackDomain(entityType) : null;
  if (!mapping) return { ...EMPTY_RESOLUTION, tier: 'T4:no_mapping' };

  const schema = tenantSchema(tenantId);

  try {
    const teamRes = await safeQuery(
      `SELECT team_id FROM "${schema}".teams WHERE team_code = $1 AND active = true LIMIT 1`,
      [mapping.fallbackTeamCode],
    );
    if (teamRes.rows.length > 0) {
      const teamId = getFirstRow(teamRes)?.team_id;
      const userId = await swallowNull(EC.FALLBACK_QUERY, distributeTask(tenantId, teamId, entityType ?? 'general'), { tenantId: tenantId, operation: 'query teams' });
      return {
        teamId,
        assignedUserId: userId,
        scopeType: mapping.scopeType as ScopeType,
        scopeId: mapping.scopeId,
        tier: userId ? 'T4:fallback_team' : 'T4:fallback_team_no_member',
        metadata: { fallbackTeamCode: mapping.fallbackTeamCode, entityType },
      };
    }
  } catch {
    // team not found
  }

  return { ...EMPTY_RESOLUTION, tier: 'T4:miss', metadata: { fallbackTeamCode: mapping.fallbackTeamCode } };
}
