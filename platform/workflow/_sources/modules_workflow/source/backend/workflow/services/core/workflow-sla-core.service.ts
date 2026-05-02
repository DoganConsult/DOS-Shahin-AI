/**
 * WorkflowSlaService — Real implementation
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export interface SlaConfig {
  workflowType: string;
  stepName?: string;
  slaHours: number;
  warningHours?: number;
  escalationHours?: number;
  escalationTo?: string;
}

export async function setSlaConfig(tenantId: string, config: SlaConfig): Promise<void> {
  const id = randomUUID();
  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.workflow_sla_configs
       (id, tenant_id, workflow_type, step_name, sla_hours, warning_hours, escalation_hours, escalation_to)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tenant_id, workflow_type, COALESCE(step_name, '')) DO UPDATE
     SET sla_hours = EXCLUDED.sla_hours,
         warning_hours = EXCLUDED.warning_hours,
         escalation_hours = EXCLUDED.escalation_hours,
         escalation_to = EXCLUDED.escalation_to,
         updated_at = NOW()`,
    [id, tenantId, config.workflowType, config.stepName || null,
     config.slaHours, config.warningHours || null,
     config.escalationHours || null, config.escalationTo || null],
  );
  logger.info('[WorkflowSLA] SLA config set', { tenantId, config });
}

export async function getSlaStatus(
  instanceId: string,
  tenantId: string,
): Promise<{ status: 'on_track' | 'warning' | 'breached'; elapsed_hours: number; sla_hours: number | null }> {
  const result = await safeQuery(
    `SELECT
       wi.created_at,
       EXTRACT(EPOCH FROM (NOW() - wi.created_at)) / 3600 AS elapsed_hours,
       sc.sla_hours,
       sc.warning_hours
     FROM __TENANT_SCHEMA__.workflow_instances wi
     LEFT JOIN __TENANT_SCHEMA__.workflow_sla_configs sc
       ON sc.workflow_type = wi.workflow_type AND sc.tenant_id = wi.tenant_id AND sc.step_name IS NULL
     WHERE wi.instance_id = $1 AND wi.tenant_id = $2`,
    [instanceId, tenantId],
  );

  if (result.rows.length === 0) {
    return { status: 'on_track', elapsed_hours: 0, sla_hours: null };
  }

  const row = result.rows[0] as { elapsed_hours: number; sla_hours: number | null; warning_hours: number | null };
  const elapsed = Number(row.elapsed_hours);
  const slaHours = row.sla_hours;
  const warningHours = row.warning_hours;

  if (!slaHours) return { status: 'on_track', elapsed_hours: elapsed, sla_hours: null };

  const status = elapsed >= slaHours ? 'breached'
    : warningHours && elapsed >= warningHours ? 'warning'
    : 'on_track';

  return { status, elapsed_hours: elapsed, sla_hours: slaHours };
}

export async function getBreachedInstances(tenantId: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT wi.instance_id
     FROM __TENANT_SCHEMA__.workflow_instances wi
     JOIN __TENANT_SCHEMA__.workflow_sla_configs sc
       ON sc.workflow_type = wi.workflow_type AND sc.tenant_id = wi.tenant_id AND sc.step_name IS NULL
     WHERE wi.tenant_id = $1
       AND wi.status IN ('pending','in_progress','awaiting_review')
       AND EXTRACT(EPOCH FROM (NOW() - wi.created_at)) / 3600 >= sc.sla_hours`,
    [tenantId],
  );
  return result.rows.map((r: { instance_id: string }) => r.instance_id);
}
