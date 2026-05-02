import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EscalationStatus = 'pending' | 'acknowledged' | 'resolved' | 'expired' | 'cancelled';
export type EscalationTrigger = 'sla_breach' | 'sla_warning' | 'manual' | 'stuck_execution' | 'approval_timeout';

export interface WorkflowEscalation {
  escalation_id: string;
  tenant_id: string;
  instance_id: string;
  sla_id: string | null;
  step_id: string | null;
  trigger: EscalationTrigger;
  level: number;
  status: EscalationStatus;
  escalated_to: string;
  escalated_by: string | null;
  message: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateEscalationInput {
  tenantId: string;
  instanceId: string;
  slaId?: string;
  stepId?: string;
  trigger: EscalationTrigger;
  level?: number;
  escalatedTo: string;
  escalatedBy?: string;
  message?: string;
  context?: Record<string, unknown>;
}

export interface EscalationRule {
  rule_id: string;
  tenant_id: string;
  sla_type: string;
  trigger: EscalationTrigger;
  level: number;
  escalate_to_role: string;
  delay_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEscalationRuleInput {
  tenantId: string;
  slaType: string;
  trigger: EscalationTrigger;
  level: number;
  escalateToRole: string;
  delayMinutes: number;
}

const ESC_COLUMNS = `escalation_id, tenant_id, instance_id, sla_id, step_id, trigger, level,
  status, escalated_to, escalated_by, message, acknowledged_at, acknowledged_by,
  resolved_at, resolved_by, resolution_notes, context, created_at, updated_at`;

const RULE_COLUMNS = `rule_id, tenant_id, sla_type, trigger, level, escalate_to_role,
  delay_minutes, is_active, created_at, updated_at`;

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

export async function getEscalation(escalationId: string, tenantId: string): Promise<WorkflowEscalation | null> {
  try {
    const result = await safeQuery(
      `SELECT ${ESC_COLUMNS}
       FROM dos.workflow_escalations
       WHERE escalation_id = $1 AND tenant_id = $2`,
      [escalationId, tenantId],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as WorkflowEscalation;
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to fetch escalation', { escalationId, tenantId, error: toErrorMessage(err) });
    return null;
  }
}

export async function createEscalation(input: CreateEscalationInput): Promise<WorkflowEscalation> {
  const escalationId = randomUUID();
  const level = input.level ?? 1;
  try {
    const result = await safeQuery(
      `INSERT INTO dos.workflow_escalations
        (escalation_id, tenant_id, instance_id, sla_id, step_id, trigger, level,
         status, escalated_to, escalated_by, message, context, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               'pending', $8, $9, $10, $11::jsonb, NOW(), NOW())
       RETURNING ${ESC_COLUMNS}`,
      [
        escalationId,
        input.tenantId,
        input.instanceId,
        input.slaId ?? null,
        input.stepId ?? null,
        input.trigger,
        level,
        input.escalatedTo,
        input.escalatedBy ?? null,
        input.message ?? null,
        JSON.stringify(input.context ?? {}),
      ],
    );
    return result.rows[0] as WorkflowEscalation;
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to create escalation', { tenantId: input.tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// List escalations for a workflow instance
// ---------------------------------------------------------------------------

export async function getEscalationsForInstance(
  instanceId: string,
  tenantId: string,
): Promise<WorkflowEscalation[]> {
  try {
    const result = await safeQuery(
      `SELECT ${ESC_COLUMNS}
       FROM dos.workflow_escalations
       WHERE instance_id = $1 AND tenant_id = $2
       ORDER BY level ASC, created_at ASC`,
      [instanceId, tenantId],
    );
    return result.rows as WorkflowEscalation[];
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to list escalations for instance', { instanceId, tenantId, error: toErrorMessage(err) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// List all pending escalations for a tenant
// ---------------------------------------------------------------------------

export async function listPendingEscalations(
  tenantId: string,
  limit = 50,
  offset = 0,
): Promise<{ data: WorkflowEscalation[]; total: number }> {
  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.workflow_escalations
       WHERE tenant_id = $1 AND status = 'pending'`,
      [tenantId],
    );
    const total = (countResult.rows[0] as { total: number })?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${ESC_COLUMNS}
       FROM dos.workflow_escalations
       WHERE tenant_id = $1 AND status = 'pending'
       ORDER BY level DESC, created_at ASC
       LIMIT $2 OFFSET $3`,
      [tenantId, Math.min(limit, 200), offset],
    );

    return { data: dataResult.rows as WorkflowEscalation[], total };
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to list pending escalations', { tenantId, error: toErrorMessage(err) });
    return { data: [], total: 0 };
  }
}

// ---------------------------------------------------------------------------
// Acknowledge
// ---------------------------------------------------------------------------

export async function acknowledgeEscalation(
  escalationId: string,
  tenantId: string,
  acknowledgedBy: string,
): Promise<WorkflowEscalation | null> {
  try {
    const escalation = await getEscalation(escalationId, tenantId);
    if (!escalation || escalation.status !== 'pending') return escalation;

    await safeQuery(
      `UPDATE dos.workflow_escalations
       SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $1, updated_at = NOW()
       WHERE escalation_id = $2 AND tenant_id = $3 AND status = 'pending'`,
      [acknowledgedBy, escalationId, tenantId],
    );

    logger.info('[WorkflowEscalation] Escalation acknowledged', { escalationId, tenantId, acknowledgedBy });
    return getEscalation(escalationId, tenantId);
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to acknowledge escalation', { escalationId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

export async function resolveEscalation(
  escalationId: string,
  tenantId: string,
  resolvedBy: string,
  notes?: string,
): Promise<WorkflowEscalation | null> {
  try {
    const escalation = await getEscalation(escalationId, tenantId);
    if (!escalation || escalation.status === 'resolved' || escalation.status === 'cancelled') return escalation;

    await safeQuery(
      `UPDATE dos.workflow_escalations
       SET status = 'resolved', resolved_at = NOW(), resolved_by = $1, resolution_notes = $2, updated_at = NOW()
       WHERE escalation_id = $3 AND tenant_id = $4 AND status IN ('pending', 'acknowledged')`,
      [resolvedBy, notes || null, escalationId, tenantId],
    );

    logger.info('[WorkflowEscalation] Escalation resolved', { escalationId, tenantId, resolvedBy });
    return getEscalation(escalationId, tenantId);
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to resolve escalation', { escalationId, tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Cancel all escalations for an instance (e.g. when workflow cancelled)
// ---------------------------------------------------------------------------

export async function cancelAllForInstance(instanceId: string, tenantId: string): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.workflow_escalations
       SET status = 'cancelled', updated_at = NOW()
       WHERE instance_id = $1 AND tenant_id = $2 AND status IN ('pending', 'acknowledged')`,
      [instanceId, tenantId],
    );

    const count = result.rowCount || 0;
    if (count > 0) {
      logger.info('[WorkflowEscalation] All escalations cancelled for instance', { instanceId, tenantId, count });
    }
    return count;
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to cancel escalations for instance', { instanceId, tenantId, error: toErrorMessage(err) });
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Escalation Rules — configurable escalation chain
// ---------------------------------------------------------------------------

export async function getEscalationRules(tenantId: string, slaType?: string): Promise<EscalationRule[]> {
  try {
    const conditions: string[] = ['tenant_id = $1', 'is_active = TRUE'];
    const params: unknown[] = [tenantId];

    if (slaType) {
      conditions.push('sla_type = $2');
      params.push(slaType);
    }

    const result = await safeQuery(
      `SELECT ${RULE_COLUMNS}
       FROM dos.workflow_escalation_rules
       WHERE ${conditions.join(' AND ')}
       ORDER BY level ASC, delay_minutes ASC`,
      params,
    );

    return result.rows as EscalationRule[];
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to get escalation rules', { tenantId, slaType, error: toErrorMessage(err) });
    return [];
  }
}

export async function createEscalationRule(input: CreateEscalationRuleInput): Promise<EscalationRule> {
      const { tenantId } = input;
  const ruleId = randomUUID();

  try {
    await safeQuery(
      `INSERT INTO dos.workflow_escalation_rules
         (rule_id, tenant_id, sla_type, trigger, level, escalate_to_role, delay_minutes, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW())`,
      [ruleId, input.tenantId, input.slaType, input.trigger, input.level, input.escalateToRole, input.delayMinutes],
    );

    logger.info('[WorkflowEscalation] Escalation rule created', { ruleId, tenantId: input.tenantId, slaType: input.slaType, level: input.level });

    const result = await safeQuery(
      `SELECT ${RULE_COLUMNS} FROM dos.workflow_escalation_rules WHERE rule_id = $1`,
      [ruleId],
    );
    return result.rows[0] as EscalationRule;
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to create escalation rule', { tenantId: input.tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function deactivateEscalationRule(ruleId: string, tenantId: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.workflow_escalation_rules
       SET is_active = FALSE, updated_at = NOW()
       WHERE rule_id = $1 AND tenant_id = $2`,
      [ruleId, tenantId],
    );

    const updated = (result.rowCount || 0) > 0;
    if (updated) {
      logger.info('[WorkflowEscalation] Escalation rule deactivated', { ruleId, tenantId });
    }
    return updated;
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to deactivate escalation rule', { ruleId, tenantId, error: toErrorMessage(err) });
    return false;
  }
}

// ---------------------------------------------------------------------------
// Auto-escalate — process SLA breaches against escalation rules
// ---------------------------------------------------------------------------

export async function processBreachEscalations(
  tenantId: string,
  breaches: Array<{ sla_id: string; instance_id: string; step_id: string | null; sla_type: string; hours_overdue: number }>,
): Promise<WorkflowEscalation[]> {
  const created: WorkflowEscalation[] = [];

  try {
    const rules = await getEscalationRules(tenantId);
    if (rules.length === 0) {
      logger.debug('[WorkflowEscalation] No active escalation rules for tenant', { tenantId });
      return created;
    }

    for (const breach of breaches) {
      const matchingRules = rules.filter((r) => r.sla_type === breach.sla_type && r.trigger === 'sla_breach');

      for (const rule of matchingRules) {
        // Check if escalation already exists for this SLA + level
        const existing = await safeQuery(
          `SELECT escalation_id FROM dos.workflow_escalations
           WHERE sla_id = $1 AND tenant_id = $2 AND level = $3 AND status != 'cancelled'`,
          [breach.sla_id, tenantId, rule.level],
        );

        if (existing.rows.length > 0) continue;

        // Check delay: only escalate if breach exceeds the rule's delay
        const delayHours = rule.delay_minutes / 60;
        if (breach.hours_overdue < delayHours) continue;

        const escalation = await createEscalation({
          tenantId,
          instanceId: breach.instance_id,
          slaId: breach.sla_id,
          stepId: breach.step_id || undefined,
          trigger: 'sla_breach',
          level: rule.level,
          escalatedTo: rule.escalate_to_role,
          escalatedBy: 'system:escalation-engine',
          message: `SLA breach auto-escalation: ${breach.sla_type} overdue by ${breach.hours_overdue.toFixed(1)} hours (level ${rule.level})`,
          context: { slaType: breach.sla_type, hoursOverdue: breach.hours_overdue, ruleId: rule.rule_id },
        });

        created.push(escalation);
      }
    }

    if (created.length > 0) {
      logger.info('[WorkflowEscalation] Auto-escalations created from breaches', { tenantId, count: created.length });
    }

    return created;
  } catch (err) {
    logger.error('[WorkflowEscalation] Failed to process breach escalations', { tenantId, error: toErrorMessage(err) });
    return created;
  }
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const WorkflowEscalationService = {
  getEscalation,
  createEscalation,
  getEscalationsForInstance,
  listPendingEscalations,
  acknowledgeEscalation,
  resolveEscalation,
  cancelAllForInstance,
  getEscalationRules,
  createEscalationRule,
  deactivateEscalationRule,
  processBreachEscalations,
};
