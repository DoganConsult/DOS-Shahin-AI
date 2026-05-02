/**
 * Risk Issue Link Service — per spec section 4.F
 *
 * Bridges risk module with shared issue/remediation engine (process_tasks).
 *
 * When assessments fail, indicators breach, or controls are deficient:
 *   - Creates issue (process_task with entity_type='risk')
 *   - Links to the originating risk
 *   - Opens treatment plan or remediation
 *   - Monitors closure
 *   - Triggers residual risk recalculation upon closure
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';

export interface CreateRiskIssueInput {
  riskId: string;
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  source: 'kri_breach' | 'assessment_failure' | 'control_deficiency' | 'sla_breach' | 'manual';
  assignedTo?: string;
  slaHours?: number;
}

export async function createRiskIssue(tenantId: string, userId: string, input: CreateRiskIssueInput) {
  const ts = tenantSchema(tenantId);
  const slaDeadline = input.slaHours
    ? `NOW() + INTERVAL '${Math.max(1, Math.min(8760, input.slaHours))} hours'`
    : 'NULL';

  const { rows } = await safeQuery(`
    INSERT INTO ${ts}.process_tasks (
      title, description, entity_type, entity_id, priority, status,
      assigned_to, created_by, sla_deadline
    ) VALUES ($1, $2, 'risk', $3, $4, 'open', $5, $6, ${slaDeadline})
    RETURNING *
  `, [
    input.title,
    input.description || '',
    input.riskId,
    input.priority,
    input.assignedTo || userId,
    userId,
  ]);

  emitEvent(({
      tenantId, module: 'risks', event: 'issue_created',
      userId, entityType: 'risk_issue', entityId: input.riskId,
      data: { issueId: rows[0]?.task_id, source: input.source },
    } as any));

  return rows[0];
}

export async function getRiskIssues(tenantId: string, riskId?: string) {
  const ts = tenantSchema(tenantId);
  const where = riskId ? `AND pt.entity_id = $1` : '';
  const params = riskId ? [riskId] : [];

  const { rows } = await safeQuery(`
    SELECT pt.*, r.title as risk_title
    FROM ${ts}.process_tasks pt
    LEFT JOIN ${ts}.risks r ON r.risk_id = pt.entity_id
    WHERE pt.entity_type = 'risk' ${where}
    ORDER BY pt.created_at DESC
  `, params);

  return rows;
}

export async function closeRiskIssue(tenantId: string, userId: string, taskId: string) {
  const ts = tenantSchema(tenantId);

  const { rows } = await safeQuery(`
    UPDATE ${ts}.process_tasks
    SET status = 'completed', completed_at = NOW(), completed_by = $1
    WHERE task_id = $2 AND entity_type = 'risk'
    RETURNING entity_id as risk_id
  `, [userId, taskId]);

  if (rows[0]?.risk_id) {
    emitEvent(({
          tenantId, module: 'risks', event: 'issue_closed',
          userId, entityType: 'risk_issue', entityId: rows[0].risk_id,
          data: { taskId, trigger: 'residual_recalc_needed' },
        } as any));
  }

  return rows[0] || null;
}

export async function getIssueStats(tenantId: string) {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      COUNT(*) FILTER (WHERE status != 'completed') as open_issues,
      COUNT(*) FILTER (WHERE status = 'completed') as closed_issues,
      COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status != 'completed') as overdue_issues,
      COUNT(*) FILTER (WHERE escalation_level > 0) as escalated_issues
    FROM ${ts}.process_tasks
    WHERE entity_type = 'risk'
  `, []);

  return rows[0] || { open_issues: 0, closed_issues: 0, overdue_issues: 0, escalated_issues: 0 };
}
