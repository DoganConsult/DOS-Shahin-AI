/**
 * WorkflowEscalationService — Real implementation
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { randomUUID } from 'crypto';

export interface EscalationRule {
  workflowType: string;
  stepName?: string;
  slaHours: number;
  escalateTo: string; // userId
  escalationType: 'sla_breach' | 'manual' | 'ai_triggered';
}

export async function triggerEscalation(
  instanceId: string,
  tenantId: string,
  escalateTo: string,
  reason: string,
  escalationType: 'sla_breach' | 'manual' | 'ai_triggered' = 'sla_breach',
  escalatedBy?: string,
): Promise<string> {
  const escalationId = randomUUID();

  await safeQuery(
    `INSERT INTO __TENANT_SCHEMA__.workflow_escalations
       (id, instance_id, tenant_id, escalation_type, escalated_to, escalated_by, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')`,
    [escalationId, instanceId, tenantId, escalationType, escalateTo, escalatedBy || null, reason],
  );

  logger.warn('[WorkflowEscalation] Escalation triggered', {
    escalationId, instanceId, tenantId, escalateTo, reason, escalationType,
  });

  return escalationId;
}

export async function acknowledgeEscalation(
  escalationId: string,
  tenantId: string,
  acknowledgedBy: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.workflow_escalations
     SET status = 'acknowledged', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'open'`,
    [escalationId, tenantId],
  );
  logger.info('[WorkflowEscalation] Escalation acknowledged', { escalationId, acknowledgedBy });
}

export async function resolveEscalation(
  escalationId: string,
  tenantId: string,
  resolvedBy: string,
): Promise<void> {
  await safeQuery(
    `UPDATE __TENANT_SCHEMA__.workflow_escalations
     SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status != 'resolved'`,
    [escalationId, tenantId],
  );
  logger.info('[WorkflowEscalation] Escalation resolved', { escalationId, resolvedBy });
}

export async function checkSlaBreaches(tenantId: string): Promise<string[]> {
  const result = await safeQuery(
    `SELECT wi.instance_id
     FROM __TENANT_SCHEMA__.workflow_instances wi
     JOIN __TENANT_SCHEMA__.workflow_sla_configs sc ON sc.workflow_type = wi.workflow_type AND sc.tenant_id = wi.tenant_id
     WHERE wi.tenant_id = $1
       AND wi.status IN ('pending', 'in_progress', 'awaiting_review')
       AND wi.updated_at < NOW() - (sc.sla_hours || ' hours')::INTERVAL
       AND NOT EXISTS (
         SELECT 1 FROM __TENANT_SCHEMA__.workflow_escalations we
         WHERE we.instance_id = wi.instance_id AND we.escalation_type = 'sla_breach' AND we.status = 'open'
       )`,
    [tenantId],
  );
  return result.rows.map((r: { instance_id: string }) => r.instance_id);
}

export async function getOpenEscalations(
  tenantId: string,
  assignedTo: string,
): Promise<Array<{ id: string; instance_id: string; reason: string; created_at: string }>> {
  const result = await safeQuery(
    `SELECT e.id, e.instance_id, e.reason, e.escalation_type, e.created_at,
            wi.workflow_type, wi.current_step
     FROM __TENANT_SCHEMA__.workflow_escalations e
     JOIN __TENANT_SCHEMA__.workflow_instances wi ON wi.instance_id = e.instance_id
     WHERE e.tenant_id = $1 AND e.escalated_to = $2 AND e.status = 'open'
     ORDER BY e.created_at ASC`,
    [tenantId, assignedTo],
  );
  return result.rows as Array<{ id: string; instance_id: string; reason: string; created_at: string }>;
}
