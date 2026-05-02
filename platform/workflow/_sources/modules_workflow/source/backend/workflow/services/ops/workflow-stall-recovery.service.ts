// ============================================
// Workflow Stall Recovery Service
// Detects workflow instances stuck in 'in_progress' with no activity
// and auto-resumes them by calling advanceStep().
// Registered as a cron job running every 5 minutes.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';

const STALL_THRESHOLD_MINUTES = 5;

interface StalledInstance {
  instance_id: string;
  workflow_id: string;
  current_step_id: string;
  status: string;
  updated_at: string;
}

/**
 * Recover stalled workflow instances for a single tenant.
 * Finds instances with status='in_progress' and no activity for >5 min,
 * then attempts to advance them.
 */
export async function recoverStalledInstances(tenantId: string): Promise<{ recovered: number; failed: number }> {
  const schema = tenantSchema(tenantId);
  let recovered = 0;
  let failed = 0;

  try {
    // Find stalled instances
    const result = await safeQuery(
      `SELECT wi.instance_id, wi.workflow_id, wi.current_step_id, wi.status, wi.updated_at
       FROM "${schema}".workflow_instances wi
       WHERE wi.status = 'in_progress'
         AND wi.updated_at < NOW() - INTERVAL '${STALL_THRESHOLD_MINUTES} minutes'
         AND wi.deleted_at IS NULL
       ORDER BY wi.updated_at ASC
       LIMIT 20`,
    );

    if (result.rows.length === 0) return { recovered: 0, failed: 0 };

    logger.info(`[StallRecovery] Found ${result.rows.length} stalled instance(s) for tenant ${tenantId}`);

    const { advanceStep } = await import('@dos/platform-core/workflows');

    for (const instance of result.rows as StalledInstance[]) {
      try {
        await advanceStep(tenantId, instance.current_step_id);

        // Log recovery event
        await safeQuery(
          `INSERT INTO "${schema}".workflow_events (instance_id, event_type, step_id, payload, triggered_by, created_by)
           VALUES ($1, 'auto_recovered', $2, $3, 'system', 'system')`,
          [instance.instance_id, instance.current_step_id, JSON.stringify({
            reason: 'stall_recovery',
            stalledSince: instance.updated_at,
            recoveredAt: new Date().toISOString(),
          })],
        );

        recovered++;
        logger.info(`[StallRecovery] Recovered instance ${instance.instance_id} (stalled since ${instance.updated_at})`);
      } catch (err: unknown) {
        failed++;
        logger.warn(`[StallRecovery] Failed to recover instance ${instance.instance_id}: ${toErrorMessage(err)}`);

        // Mark as failed if recovery fails repeatedly
        try {
          await safeQuery(
            `INSERT INTO "${schema}".workflow_events (instance_id, event_type, step_id, payload, triggered_by, created_by)
             VALUES ($1, 'recovery_failed', $2, $3, 'system', 'system')`,
            [instance.instance_id, instance.current_step_id, JSON.stringify({
              error: toErrorMessage(err),
              attemptedAt: new Date().toISOString(),
            })],
          );
        } catch { /* non-fatal */ }
      }
    }
  } catch (err: unknown) {
    logger.warn(`[StallRecovery] Error scanning tenant ${tenantId}: ${toErrorMessage(err)}`);
  }

  return { recovered, failed };
}

/**
 * Run stall recovery across all active tenants.
 * Called by the cron job every 5 minutes.
 */
export async function runStallRecoveryForAllTenants(): Promise<void> {
  try {
    const tenants = await safeQuery(
      "SELECT tenant_id FROM tenants WHERE status = 'active'",
    );

    let totalRecovered = 0;
    let totalFailed = 0;

    for (const t of tenants.rows) {
      const result = await recoverStalledInstances(t.tenant_id);
      totalRecovered += result.recovered;
      totalFailed += result.failed;
    }

    if (totalRecovered > 0 || totalFailed > 0) {
      logger.info(`[StallRecovery] Cycle complete: ${totalRecovered} recovered, ${totalFailed} failed across ${tenants.rows.length} tenants`);
    }
  } catch (err: unknown) {
    logger.warn(`[StallRecovery] Cycle failed: ${toErrorMessage(err)}`);
  }
}
