/**
 * workflow-service — governance-ai / signal-detection adapter.
 *
 * Records a governance-ai run request and publishes a
 * `governance.signal_scan.requested` event. The full detector array lives in
 * the governance-service module; this adapter keeps the orchestration layer
 * non-blocking and lets the downstream subscriber do the detection work.
 *
 * Contract:
 *   runSignalScan(tenantId) → { signalsCreated, run_id, errors }
 *
 * Returns signalsCreated = 0 when the scan is only requested (the async
 * detector writes signals and updates the run row later). If the caller
 * wants inline detection it can subscribe to `governance.signal_scan.completed`.
 */
import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { publish } from '@dos/event-backbone';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ScanResult {
  /** camelCase accessor for workflow-service internal use. */
  signalsCreated: number;
  /** snake_case accessor required by legacy activity callers. */
  signals_created: number;
  run_id: string;
  errors: string[];
}

export async function runSignalScan(tenantId: string): Promise<ScanResult> {
  const runId = randomUUID();
  const errors: string[] = [];

  try {
    await safeQuery(
      `INSERT INTO public.governance_ai_runs (id, tenant_id, run_type, status, started_at)
       VALUES ($1, $2, 'signal_scan', 'requested', NOW())
       ON CONFLICT (id) DO NOTHING`,
      [runId, tenantId],
    );
  } catch (err) {
    logger.warn('[SignalDetection] run-row insert failed (table may be missing)', {
      tenantId, runId, error: toErrorMessage(err),
    });
    errors.push(`run-row insert: ${toErrorMessage(err)}`);
  }

  await publish('governance.signal_scan.requested', tenantId, {
    runId,
    requestedAt: new Date().toISOString(),
  });

  return { signalsCreated: 0, signals_created: 0, run_id: runId, errors };
}
