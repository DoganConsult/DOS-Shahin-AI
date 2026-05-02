#!/usr/bin/env tsx
/**
 * Slow-migration report.
 *
 * Queries dos.tenant_migrations for per-(migration, status) duration
 * statistics and flags:
 *
 *   - migrations with p95 > --p95-ms-threshold (default 2000ms)
 *   - migrations where max > 4× median (outlier tenant — schema skew,
 *     blocked lock, or a data-proportional operation that shouldn't be)
 *   - migrations whose median duration drifted > 50% between the first
 *     10% of applications and the last 10% (fleet hot-spot or data growth)
 *
 * Output:
 *   stdout — JSON summary (for piping into dashboards)
 *   stderr — human-readable table
 *
 * Read-only. Uses percentile_cont aggregates so the whole calculation
 * stays in Postgres.
 *
 * Usage:
 *   tsx ops/normalization/scripts/slow-migrations.ts
 *   tsx ops/normalization/scripts/slow-migrations.ts --p95-ms-threshold 5000 --limit 50
 */

import { getPool, safeQuery } from '@dos/db';

function arg(flag: string, def?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

interface Row {
  migration_id: string;
  source: string;
  n: number;
  n_applied: number;
  n_failed: number;
  median_ms: number;
  p95_ms: number;
  max_ms: number;
  first_quintile_median_ms: number | null;
  last_quintile_median_ms: number | null;
}

async function main(): Promise<void> {
  const p95Threshold = parseInt(arg('--p95-ms-threshold', '2000')!, 10);
  const limit = parseInt(arg('--limit', '25')!, 10);

  const res = await safeQuery<Row>(`
    WITH applications AS (
      SELECT migration_id, source, status, duration_ms, applied_at,
             ntile(5) OVER (PARTITION BY migration_id ORDER BY applied_at) AS quintile
        FROM dos.tenant_migrations
       WHERE status IN ('applied','failed')
    )
    SELECT
      migration_id, MAX(source) AS source,
      count(*)::int                                          AS n,
      count(*) FILTER (WHERE status='applied')::int          AS n_applied,
      count(*) FILTER (WHERE status='failed')::int           AS n_failed,
      percentile_cont(0.5)  WITHIN GROUP (ORDER BY duration_ms)::int AS median_ms,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::int AS p95_ms,
      MAX(duration_ms)::int                                  AS max_ms,
      (percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE quintile = 1))::int AS first_quintile_median_ms,
      (percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) FILTER (WHERE quintile = 5))::int AS last_quintile_median_ms
    FROM applications
    GROUP BY migration_id
    ORDER BY p95_ms DESC
    LIMIT $1
  `, [limit]);

  const flagged: Array<{ row: Row; reasons: string[] }> = [];
  for (const r of res.rows) {
    const reasons: string[] = [];
    if (r.p95_ms > p95Threshold) reasons.push(`p95>${p95Threshold}ms`);
    if (r.max_ms > 4 * Math.max(r.median_ms, 1)) reasons.push(`max(${r.max_ms}) > 4×median(${r.median_ms})`);
    if (r.first_quintile_median_ms && r.last_quintile_median_ms) {
      const ratio = r.last_quintile_median_ms / Math.max(r.first_quintile_median_ms, 1);
      if (ratio > 1.5 || ratio < 1 / 1.5) {
        reasons.push(`drift ${r.first_quintile_median_ms}ms -> ${r.last_quintile_median_ms}ms`);
      }
    }
    if (r.n_failed > 0) reasons.push(`${r.n_failed} failed`);
    if (reasons.length > 0) flagged.push({ row: r, reasons });
  }

  console.error(`slow-migrations: ${res.rows.length} migrations analyzed, ${flagged.length} flagged`);
  console.error('migration_id'.padEnd(50), 'n', 'fail', 'median', 'p95', 'max', 'reasons');
  for (const f of flagged) {
    console.error(
      f.row.migration_id.padEnd(50),
      String(f.row.n).padStart(4),
      String(f.row.n_failed).padStart(4),
      String(f.row.median_ms).padStart(6),
      String(f.row.p95_ms).padStart(6),
      String(f.row.max_ms).padStart(6),
      f.reasons.join(' ; '),
    );
  }
  process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), flagged, all: res.rows }, null, 2));
  await getPool().end();
  process.exit(flagged.length > 0 ? 0 : 0); // informational — never non-zero
}

main().catch((err) => { console.error('slow-migrations: fatal', err); process.exit(1); });
