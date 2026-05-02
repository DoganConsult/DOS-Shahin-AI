/**
 * Risk-local governance escalation hooks (stay under modules/risk for tsc rootDir).
 * Implements the security escalation path used by vulnerabilities routes.
 */
import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { EC, catchHandler } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export async function registerGovernanceHooks(_tenantId: string): Promise<void> {
  return;
}

/**
 * Escalate security vulnerability to governance when severity is high/critical.
 */
export async function escalateSecurityEventToGovernance(
  tenantId: string,
  entityId: string,
  eventType: string,
  severity: string,
  title: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    const secPriority = severity === 'critical' ? 'critical' : 'high';
    const secResult = await safeQuery(
      `
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES ($1, $2, $3, 'open', 'security', $4::uuid, $5, NOW(), NOW())
      RETURNING action_id
    `,
      [
        `Security alert: ${title}`,
        `Auto-escalated security event (${eventType}). Severity: ${severity}.`,
        secPriority,
        entityId,
        severity === 'critical',
      ],
    );
    const secActionId = secResult.rows[0]?.action_id;
    if (secActionId) {
      await emitEvent(({
        tenantId,
        userId: SYSTEM_JOB_ACTOR,
        module: 'action_items',
        event: 'created',
        entityType: 'governance_action',
        entityId: String(secActionId),
        data: { source_type: 'security', source_id: entityId, priority: secPriority, severity, eventType },
      } as Record<string, unknown>)).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to escalate security event: ${toErrorMessage(err)}`);
  }
}
