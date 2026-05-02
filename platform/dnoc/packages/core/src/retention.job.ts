/**
 * DNOC retention job.
 *
 * Prunes old rows from platform_dnoc.metrics, platform_dnoc.logs, and
 * platform_dnoc.traces according to the retention configured in env
 * (DNOC_METRICS_RETENTION_DAYS, DNOC_LOGS_RETENTION_DAYS,
 * DNOC_TRACES_RETENTION_DAYS).
 *
 * High-volume tables — the DELETEs are executed in a DELETE...WHERE
 * statement against the indexed (recorded_at / emitted_at / started_at)
 * columns, so they are efficient even with millions of rows.
 */

export interface RetentionDeps {
  readonly query: (text: string, params: unknown[]) => Promise<{ rows: any[] }>;
}

export interface RetentionResult {
  readonly metricsDeleted: number;
  readonly logsDeleted: number;
  readonly tracesDeleted: number;
}

export interface RetentionOptions {
  readonly metricsDays: number;
  readonly logsDays: number;
  readonly tracesDays: number;
}

export async function runDNOCRetention(
  deps: RetentionDeps,
  opts: RetentionOptions,
): Promise<RetentionResult> {
  if (opts.metricsDays <= 0 || opts.logsDays <= 0 || opts.tracesDays <= 0) {
    throw new Error('[dnoc-retention] retention days must be positive');
  }

  const metricsRes = await deps.query(
    `DELETE FROM platform_dnoc.metrics
       WHERE recorded_at < NOW() - ($1 || ' days')::interval
       RETURNING 1`,
    [String(opts.metricsDays)],
  );

  const logsRes = await deps.query(
    `DELETE FROM platform_dnoc.logs
       WHERE emitted_at < NOW() - ($1 || ' days')::interval
       RETURNING 1`,
    [String(opts.logsDays)],
  );

  const tracesRes = await deps.query(
    `DELETE FROM platform_dnoc.traces
       WHERE started_at < NOW() - ($1 || ' days')::interval
       RETURNING 1`,
    [String(opts.tracesDays)],
  );

  return {
    metricsDeleted: metricsRes.rows.length,
    logsDeleted: logsRes.rows.length,
    tracesDeleted: tracesRes.rows.length,
  };
}

/**
 * Start a repeating retention loop. Returns a dispose function that
 * clears the interval. intervalMs defaults to 6 hours.
 */
export function startDNOCRetentionLoop(
  deps: RetentionDeps,
  opts: RetentionOptions & { intervalMs?: number },
): () => void {
  const intervalMs = opts.intervalMs ?? 6 * 60 * 60 * 1000;
  const tick = async () => {
    try {
      const result = await runDNOCRetention(deps, opts);
      console.log(
        `[dnoc-retention] deleted metrics=${result.metricsDeleted} ` +
        `logs=${result.logsDeleted} traces=${result.tracesDeleted}`,
      );
    } catch (err) {
      console.error('[dnoc-retention] tick failed', err);
    }
  };
  const handle = setInterval(() => void tick(), intervalMs);
  // Run once on startup so the first prune doesn't wait intervalMs.
  void tick();
  return () => clearInterval(handle);
}
