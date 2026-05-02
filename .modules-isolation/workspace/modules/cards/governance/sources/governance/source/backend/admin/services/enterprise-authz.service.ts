import { logger } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '@dos/db';
import { createProcessTask } from '@dos/platform-core/workflows';
import type { ProcessTaskInput } from '@dos/platform-core/workflows';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { getEventBus } from '@dos/module-sdk';

export { logger, safeQuery as safeQuery, tenantSchema, createProcessTask, swallow, EC, toErrorMessage };
export type { ProcessTaskInput };

const eventBus = {
  publish: (...args: Parameters<ReturnType<typeof getEventBus>['publish']>) => getEventBus().publish(...args),
};

export { eventBus };

export interface FindEligibleAssigneesOptions {
  includeDelegations?: boolean;
  limit?: number;
  excludeUserIds?: string[];
}

export interface EligibleAssignee {
  userId: string;
  email: string;
  displayName: string;
  functionalRoleCode: string;
  department?: string;
}

export interface LogDecisionInput {
  userId: string;
  tenantId: string;
  permissionCode: string;
  moduleCode: string;
  allowed: boolean;
  reason?: string;
  entityType?: string;
  entityId?: string;
  context?: Record<string, unknown>;
}

export interface AuthzDecisionRecord {
  id: string;
  userId: string;
  permissionCode: string;
  moduleCode: string;
  allowed: boolean;
  decidedAt: string;
}

async function findEligibleAssignees(
  tenantId: string,
  moduleCode: string,
  permissionCode: string,
  options: FindEligibleAssigneesOptions = {},
): Promise<EligibleAssignee[]> {
  const schema = tenantSchema(tenantId);
  const limit = options.limit ?? 10;

  try {
    const result = await safeQuery(
      `SELECT DISTINCT u.user_id, u.email, u.first_name, u.last_name,
              r.role_code AS functional_role_code, u.department_id
       FROM "${schema}".users u
       JOIN "${schema}".user_roles ur ON ur.user_id = u.user_id
       JOIN "${schema}".roles r ON r.role_id = ur.role_id
       JOIN "${schema}".role_permissions rp ON rp.role_id = r.role_id
       JOIN "${schema}".permissions p ON p.permission_id = rp.permission_id
       WHERE p.permission_code = $1
         AND (p.module_code = $2 OR p.module_code = 'global')
         AND u.is_active = true
         ${options.excludeUserIds?.length ? `AND u.user_id != ALL($4::uuid[])` : ''}
       ORDER BY u.last_name, u.first_name
       LIMIT $3`,
      options.excludeUserIds?.length
        ? [permissionCode, moduleCode, limit, options.excludeUserIds]
        : [permissionCode, moduleCode, limit],
    );

    const assignees: EligibleAssignee[] = result.rows.map((row) => ({
      userId: row.user_id,
      email: row.email,
      displayName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
      functionalRoleCode: row.functional_role_code,
      department: row.department_id,
    }));

    if (options.includeDelegations && assignees.length < limit) {
      try {
        const delegationResult = await safeQuery(
          `SELECT DISTINCT u.user_id, u.email, u.first_name, u.last_name,
                  d.delegated_role_code AS functional_role_code, u.department_id
           FROM "${schema}".users u
           JOIN "${schema}".delegations d ON d.delegatee_user_id = u.user_id
           WHERE d.module_code = $1
             AND d.is_active = true
             AND (d.expires_at IS NULL OR d.expires_at > NOW())
           LIMIT $2`,
          [moduleCode, limit - assignees.length],
        );
        const existingIds = new Set(assignees.map((a) => a.userId));
        for (const row of delegationResult.rows) {
          if (!existingIds.has(row.user_id)) {
            assignees.push({
              userId: row.user_id,
              email: row.email,
              displayName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
              functionalRoleCode: row.functional_role_code,
              department: row.department_id,
            });
          }
        }
      } catch {
      }
    }

    return assignees;
  } catch (err: unknown) {
    logger.warn(`[EnterpriseAuthz] findEligibleAssignees failed: ${toErrorMessage(err)}`);
    return [];
  }
}

async function logDecision(tenantId: string, input: LogDecisionInput): Promise<void> {
  const schema = tenantSchema(tenantId);
  swallow(EC.EVENT_BUS,
    safeQuery(
      `INSERT INTO "${schema}".authz_decision_log
         (user_id, permission_code, module_code, allowed, reason, entity_type, entity_id, context, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        input.userId,
        input.permissionCode,
        input.moduleCode,
        input.allowed,
        input.reason || null,
        input.entityType || null,
        input.entityId || null,
        input.context ? JSON.stringify(input.context) : null,
      ],
    ),
    { tenantId, operation: 'enterpriseAuthz:logDecision' },
  );
}

async function checkPermission(
  tenantId: string,
  userId: string,
  permissionCode: string,
  moduleCode: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT 1
       FROM "${schema}".user_roles ur
       JOIN "${schema}".role_permissions rp ON rp.role_id = ur.role_id
       JOIN "${schema}".permissions p ON p.permission_id = rp.permission_id
       WHERE ur.user_id = $1
         AND p.permission_code = $2
         AND (p.module_code = $3 OR p.module_code = 'global')
       LIMIT 1`,
      [userId, permissionCode, moduleCode],
    );
    const allowed = result.rows.length > 0;
    return { allowed, reason: allowed ? undefined : 'No matching role permission found' };
  } catch (err: unknown) {
    logger.warn(`[EnterpriseAuthz] checkPermission failed: ${toErrorMessage(err)}`);
    return { allowed: false, reason: 'Permission check unavailable' };
  }
}

async function provisionFromLegacyRole(
  tenantId: string,
  userId: string,
  legacyRole: string,
  context: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    const roleResult = await safeQuery(
      `SELECT role_id FROM "${schema}".roles WHERE legacy_role_code = $1 OR role_code = $1 LIMIT 1`,
      [legacyRole],
    );
    if (roleResult.rows.length === 0) {
      logger.warn(`[EnterpriseAuthz] Legacy role not found: ${legacyRole}`);
      return;
    }
    const roleId = roleResult.rows[0].role_id;
    await safeQuery(
      `INSERT INTO "${schema}".user_roles (user_id, role_id, granted_by, granted_context, created_at)
       VALUES ($1, $2, 'system:provisioning', $3, NOW())
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId, context],
    );
    logger.info(`[EnterpriseAuthz] Provisioned legacy role ${legacyRole} for user ${userId}`, { tenantId, context });
  } catch (err: unknown) {
    logger.warn(`[EnterpriseAuthz] provisionFromLegacyRole failed: ${toErrorMessage(err)}`);
  }
}

async function getDecisionHistory(
  tenantId: string,
  userId: string,
  options?: { limit?: number; moduleCode?: string },
): Promise<AuthzDecisionRecord[]> {
  const schema = tenantSchema(tenantId);
  try {
    const params: unknown[] = [userId, options?.limit ?? 50];
    let query = `SELECT id, user_id, permission_code, module_code, allowed, decided_at
                 FROM "${schema}".authz_decision_log
                 WHERE user_id = $1`;
    if (options?.moduleCode) {
      query += ` AND module_code = $3`;
      params.push(options.moduleCode);
    }
    query += ` ORDER BY decided_at DESC LIMIT $2`;
    const result = await safeQuery(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      permissionCode: row.permission_code,
      moduleCode: row.module_code,
      allowed: row.allowed,
      decidedAt: row.decided_at,
    }));
  } catch {
    return [];
  }
}

export const enterpriseAuthzService = {
  findEligibleAssignees,
  logDecision,
  checkPermission,
  provisionFromLegacyRole,
  getDecisionHistory,
};
