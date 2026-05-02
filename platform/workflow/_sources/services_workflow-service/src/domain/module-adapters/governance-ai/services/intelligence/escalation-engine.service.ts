/**
 * workflow-service — governance-ai / escalation-engine adapter.
 *
 * Scans unresolved governance issues whose SLA has expired and publishes
 * an `governance.escalation.requested` event. Full escalation decision
 * logic (routing to approvers, recording decisions) lives in
 * governance-service.
 */
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface EscalationScanResult {
  /** camelCase accessor for workflow-service internal use. */
  escalated: number;
  /** snake_case accessor required by legacy activity callers. */
  escalations_created: number;
  errors: string[];
}

export async function runEscalationScan(tenantId: string): Promise<EscalationScanResult> {
  const errors: string[] = [];
  let overdueIssueIds: string[] = [];

  try {
    const res = await safeQuery(
      `SELECT id
         FROM public.governance_issues
        WHERE tenant_id = $1
          AND status IN ('new', 'in_progress')
          AND sla_due_at IS NOT NULL
          AND sla_due_at < NOW()
          AND COALESCE(escalated, false) = false
        ORDER BY sla_due_at ASC
        LIMIT 100`,
      [tenantId],
    );
    overdueIssueIds = res.rows.map((r: { id: string }) => r.id);
  } catch (err) {
    logger.warn('[EscalationEngine] SLA lookup failed', {
      tenantId, error: toErrorMessage(err),
    });
    errors.push(`sla_lookup: ${toErrorMessage(err)}`);
    return { escalated: 0, escalations_created: 0, errors };
  }

  if (overdueIssueIds.length === 0) {
    return { escalated: 0, escalations_created: 0, errors };
  }

  await publish('governance.escalation.requested', tenantId, {
    issueIds: overdueIssueIds,
    requestedAt: new Date().toISOString(),
  });

  const count = overdueIssueIds.length;
  return { escalated: count, escalations_created: count, errors };
}
