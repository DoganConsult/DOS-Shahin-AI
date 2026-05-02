// Governance-OS learning metrics — counter/timer recorder for the OS learning
// loop. Backed by dos.governance_os_learning_metrics (one row per metric per
// tenant; updated_at is the moving window). Sibling files (learning-memory,
// learning-health) consume `recordEventProcessing` and `recordCaseCreation`
// to attribute observability to specific learning cycles.

import { safeQuery } from '@dos/db';

export type MetricKind =
  | 'event.processed'
  | 'case.created'
  | 'memory.write'
  | 'memory.read'
  | 'score.update'
  | string;

/**
 * Increment a named metric counter, optionally tagged by module + cycle.
 * Failures (missing table) are swallowed — metrics must not break the
 * learning loop's primary action.
 */
async function bumpCounter(
  tenantId: string,
  metric: MetricKind,
  delta: number,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO dos.governance_os_learning_metrics
         (tenant_id, metric, value, metadata, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (tenant_id, metric)
       DO UPDATE SET value = dos.governance_os_learning_metrics.value + EXCLUDED.value,
                     metadata = EXCLUDED.metadata,
                     updated_at = NOW()`,
      [tenantId, metric, delta, JSON.stringify(meta ?? {})],
    );
  } catch {
    // table absent / migration pending — silent no-op
  }
}

export async function recordEventProcessing(
  tenantId: string,
  meta: { module?: string; eventType?: string; cycleId?: string; durationMs?: number } = {},
): Promise<void> {
  await bumpCounter(tenantId, 'event.processed', 1, meta);
}

export async function recordCaseCreation(
  tenantId: string,
  meta: { module?: string; caseType?: string; cycleId?: string } = {},
): Promise<void> {
  await bumpCounter(tenantId, 'case.created', 1, meta);
}

export async function recordMemoryRead(
  tenantId: string,
  meta: { module?: string; key?: string } = {},
): Promise<void> {
  await bumpCounter(tenantId, 'memory.read', 1, meta);
}

export async function recordMemoryWrite(
  tenantId: string,
  meta: { module?: string; key?: string } = {},
): Promise<void> {
  await bumpCounter(tenantId, 'memory.write', 1, meta);
}

export async function getMetric(
  tenantId: string,
  metric: MetricKind,
): Promise<{ value: number; updatedAt: string | null }> {
  try {
    const r = await safeQuery(
      `SELECT value, updated_at
         FROM dos.governance_os_learning_metrics
        WHERE tenant_id = $1 AND metric = $2
        LIMIT 1`,
      [tenantId, metric],
    );
    const row = r.rows[0] as Record<string, unknown> | undefined;
    if (!row) return { value: 0, updatedAt: null };
    return {
      value: Number(row['value'] ?? 0),
      updatedAt: (row['updated_at'] as string) ?? null,
    };
  } catch {
    return { value: 0, updatedAt: null };
  }
}
