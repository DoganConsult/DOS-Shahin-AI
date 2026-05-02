/**
 * workflow-service — process-task-monitor adapter.
 *
 * Scans the tenant's workflow tasks for SLA breaches + warnings. Returns
 * aggregate counts suitable for the monitoring activity. Uses the tenant
 * schema's `workflow_tasks` table (same shape as task-core.service in the
 * workflow module).
 */
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface SlaScanResult {
  breached: number;
  warnings: number;
  total: number;
  errors: string[];
}

/**
 * Count tasks whose SLA is breached (due_at < now + status active) versus
 * those approaching breach within the warning window (default: 4 hours).
 * Returns zero counts when the tenant schema doesn't yet have the table —
 * that's a valid in-progress provisioning state, not a failure.
 */
export async function checkProcessTaskSLAs(
  tenantId: string,
  opts?: { warningWindowHours?: number },
): Promise<SlaScanResult> {
  const warningHours = opts?.warningWindowHours ?? 4;
  const errors: string[] = [];
  try {
    const res = await safeQuery(
      `SELECT
         COUNT(*) FILTER (
           WHERE status IN ('pending','in_progress','assigned')
             AND due_at IS NOT NULL
             AND due_at < NOW()
         ) AS breached,
         COUNT(*) FILTER (
           WHERE status IN ('pending','in_progress','assigned')
             AND due_at IS NOT NULL
             AND due_at >= NOW()
             AND due_at < NOW() + ($1 || ' hours')::interval
         ) AS warnings,
         COUNT(*) FILTER (
           WHERE status IN ('pending','in_progress','assigned')
         ) AS total
       FROM dos.workflow_tasks
       WHERE tenant_id = $2`,
      [String(warningHours), tenantId],
    );
    const row = res.rows[0] as
      | { breached: string | number; warnings: string | number; total: string | number }
      | undefined;
    return {
      breached: Number(row?.breached ?? 0),
      warnings: Number(row?.warnings ?? 0),
      total: Number(row?.total ?? 0),
      errors,
    };
  } catch (err) {
    logger.warn('[ProcessTaskMonitor] SLA scan failed', {
      tenantId, error: toErrorMessage(err),
    });
    errors.push(toErrorMessage(err));
    return { breached: 0, warnings: 0, total: 0, errors };
  }
}
