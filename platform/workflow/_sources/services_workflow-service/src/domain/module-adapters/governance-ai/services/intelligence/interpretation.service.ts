/**
 * workflow-service — governance-ai / interpretation adapter.
 *
 * Reads pending governance signals for the tenant, publishes an
 * `governance.signals.interpret.requested` event, and returns the list of
 * signal ids queued for interpretation. The full LLM-backed interpretation
 * pipeline runs in governance-service's subscriber.
 */
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface InterpretedIssue {
  issueId: string;
  signalId: string;
  tenantId: string;
  createdAt: string;
}

export async function interpretNewSignals(tenantId: string): Promise<InterpretedIssue[]> {
  let pendingSignalIds: string[] = [];

  try {
    const res = await safeQuery(
      `SELECT id
         FROM public.governance_signals
        WHERE tenant_id = $1
          AND status = 'new'
        ORDER BY detected_at ASC
        LIMIT 100`,
      [tenantId],
    );
    pendingSignalIds = res.rows.map((r: { id: string }) => r.id);
  } catch (err) {
    logger.warn('[Interpretation] pending signal lookup failed', {
      tenantId, error: toErrorMessage(err),
    });
    return [];
  }

  if (pendingSignalIds.length === 0) return [];

  await publish('governance.signals.interpret.requested', tenantId, {
    signalIds: pendingSignalIds,
    requestedAt: new Date().toISOString(),
  });

  const now = new Date().toISOString();
  return pendingSignalIds.map((signalId) => ({
    issueId: `pending-${signalId}`,
    signalId,
    tenantId,
    createdAt: now,
  }));
}
