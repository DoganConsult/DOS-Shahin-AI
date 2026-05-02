/**
 * DSOC retention job.
 *
 * Deletes audit_log rows older than N days from platform_dsoc.audit_log.
 * Resolved alerts older than M days are pruned from platform_dsoc.alerts.
 * Everything is tenant-agnostic — same retention per environment.
 *
 * Wire at dos-service bootstrap via setInterval or a scheduled_jobs row.
 * The InMemory adapters used in tests implement the same `prune` shape.
 */

export interface RetentionDeps {
  readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>;
}

export interface RetentionResult {
  readonly auditLogDeleted: number;
  readonly alertsDeleted: number;
}

export async function runDSOCRetention(
  deps: RetentionDeps,
  opts: { auditLogDays: number; resolvedAlertDays: number },
): Promise<RetentionResult> {
  if (opts.auditLogDays <= 0 || opts.resolvedAlertDays <= 0) {
    throw new Error('[dsoc-retention] retention days must be positive');
  }

  const auditLogRes = await deps.query(
    `DELETE FROM platform_dsoc.audit_log
       WHERE occurred_at < NOW() - ($1 || ' days')::interval
       RETURNING 1`,
    [String(opts.auditLogDays)],
  );

  const alertsRes = await deps.query(
    `DELETE FROM platform_dsoc.alerts
       WHERE status = 'resolved' AND resolved_at < NOW() - ($1 || ' days')::interval
       RETURNING 1`,
    [String(opts.resolvedAlertDays)],
  );

  return {
    auditLogDeleted: auditLogRes.rows.length,
    alertsDeleted: alertsRes.rows.length,
  };
}

/**
 * Start a repeating DSOC retention loop. Returns a dispose function.
 * intervalMs defaults to 6 hours. Runs immediately on startup.
 */
export function startDSOCRetentionLoop(
  deps: RetentionDeps,
  opts: { auditLogDays: number; resolvedAlertDays: number; intervalMs?: number },
): () => void {
  const intervalMs = opts.intervalMs ?? 6 * 60 * 60 * 1000;
  const tick = async () => {
    try {
      const result = await runDSOCRetention(deps, opts);
      console.log(
        `[dsoc-retention] deleted audit_log=${result.auditLogDeleted} alerts=${result.alertsDeleted}`,
      );
    } catch (err) {
      console.error('[dsoc-retention] tick failed', err);
    }
  };
  const handle = setInterval(() => void tick(), intervalMs);
  void tick();
  return () => clearInterval(handle);
}
