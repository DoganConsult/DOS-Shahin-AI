import { safeQuery, tenantSchema } from '../ports/database.port';
import type { ConfigAuditEntry } from '../contracts/config-center.contracts';
import type { SettingsScope } from '@dos/platform-core/settings/settings-resolver.service';
import { logger } from '../ports/logger.port';

export interface LogChangeInput {
  tenantId: string;
  configKey: string;
  scope: SettingsScope | string;
  oldValue: unknown;
  newValue: unknown;
  changeType: ConfigAuditEntry['changeType'];
  actorId: string;
  actorType: ConfigAuditEntry['actorType'];
  source: string;
  reason?: string;
  moduleCode?: string;
  productKey?: string;
  workspaceId?: string;
}

export async function logConfigChange(input: LogChangeInput): Promise<void> {
  const schema = tenantSchema(input.tenantId);
  try {
    await safeQuery(
      `INSERT INTO "${schema}".config_center_audit_log
        (config_key, scope, old_value, new_value, change_type, actor_id, actor_type, source, reason, module_code, product_key, workspace_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        input.configKey,
        input.scope,
        input.oldValue !== null ? JSON.stringify(input.oldValue) : null,
        input.newValue !== null ? JSON.stringify(input.newValue) : null,
        input.changeType,
        input.actorId,
        input.actorType,
        input.source,
        input.reason ?? null,
        input.moduleCode ?? null,
        input.productKey ?? null,
        input.workspaceId ?? null,
      ]
    );
  } catch (err) {
    logger.warn('[ConfigCenter] Failed to log audit entry', { key: input.configKey, error: String(err) });
  }
}

export async function getConfigAuditHistory(
  tenantId: string,
  options?: { key?: string; actorId?: string; scope?: string; limit?: number; offset?: number }
): Promise<ConfigAuditEntry[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (options?.key) {
    conditions.push(`config_key = $${idx++}`);
    params.push(options.key);
  }
  if (options?.actorId) {
    conditions.push(`actor_id = $${idx++}`);
    params.push(options.actorId);
  }
  if (options?.scope) {
    conditions.push(`scope = $${idx++}`);
    params.push(options.scope);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const { rows } = await safeQuery(
    `SELECT audit_id, tenant_id, config_key, scope, old_value, new_value, change_type,
            actor_id, actor_type, source, reason, module_code, product_key, workspace_id, created_at
     FROM "${schema}".config_center_audit_log
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return rows.map((row: Record<string, unknown>) => ({
    auditId: row.audit_id as string,
    tenantId: row.tenant_id as string,
    configKey: row.config_key as string,
    scope: row.scope as string,
    oldValue: row.old_value,
    newValue: row.new_value,
    changeType: row.change_type as ConfigAuditEntry['changeType'],
    actorId: row.actor_id as string,
    actorType: row.actor_type as ConfigAuditEntry['actorType'],
    source: row.source as string,
    reason: (row.reason as string) ?? undefined,
    moduleCode: (row.module_code as string) ?? undefined,
    productKey: (row.product_key as string) ?? undefined,
    workspaceId: (row.workspace_id as string) ?? undefined,
    createdAt: String(row.created_at),
  }));
}
