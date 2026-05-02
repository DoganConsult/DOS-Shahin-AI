// ============================================
// Shahin — AGRC-OS Metrics Service (Product)
// Health check, Prometheus-style metrics,
// and snapshot persistence for monitoring.
// NOTE: This is an AGRC product service residing
// in the platform directory. Law 2 ownership: agrc.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

export interface AGRCMetrics {
  cycleCount: number;
  avgCycleMs: number;
  enforcementRate: number;
  staleControlPct: number;
  telemetryIngestionRate: number;
  eventCount: number;
  criticalEvents: number;
  healthStatus: 'healthy' | 'degraded' | 'critical';
  lastCycleAt: string | null;
  uptimeHours: number;
}

// ── Compute live metrics ───────────────────────────────────────────────────

export async function computeMetrics(tenantId: string, hours: number = 24): Promise<AGRCMetrics> {
  const schema = tenantSchema(tenantId);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  let cycleCount = 0, avgCycleMs = 0, enforcementRate = 0, lastCycleAt: string | null = null;
  let staleControlPct = 0, telemetryIngestionRate = 0;
  let eventCount = 0, criticalEvents = 0;

  // Orchestration cycles
  try {
    const cycleRes = await safeQuery(
      `SELECT COUNT(*)::int AS cnt, COALESCE(AVG(cycle_ms),0)::int AS avg_ms,
              COALESCE(SUM(enforcement_actions),0)::int AS enforcements,
              COALESCE(SUM(telemetry_ingested),0)::int AS telemetry,
              MAX(executed_at) AS last_at
       FROM "${schema}".agrc_os_cycle_log WHERE executed_at >= $1`, [cutoff]
    );
    const r = getFirstRow(cycleRes);
    cycleCount = r?.cnt || 0;
    avgCycleMs = r?.avg_ms || 0;
    telemetryIngestionRate = r?.telemetry || 0;
    lastCycleAt = r?.last_at || null;
    const totalDecisions = cycleCount > 0 ? cycleCount : 1;
    enforcementRate = Math.round((r?.enforcements || 0) / totalDecisions * 100) / 100;
  } catch { /* table may not exist */ }

  // Stale controls
  try {
    const ccmRes = await safeQuery(
      `SELECT COALESCE(SUM(stale_controls),0)::int AS stale, COALESCE(SUM(controls_evaluated),0)::int AS total
       FROM "${schema}".ccm_cycle_log WHERE executed_at >= $1`, [cutoff]
    );
    const total = getFirstRow(ccmRes)?.total || 1;
    staleControlPct = Math.round((getFirstRow(ccmRes)?.stale || 0) / total * 10000) / 100;
  } catch { /* table may not exist */ }

  // Event bus stats
  try {
    const eventRes = await safeQuery(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE severity='critical')::int AS critical
       FROM "${schema}".agrc_event_log WHERE created_at >= $1`, [cutoff]
    );
    eventCount = getFirstRow(eventRes)?.total || 0;
    criticalEvents = getFirstRow(eventRes)?.critical || 0;
  } catch { /* table may not exist */ }

  // Health status
  let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  if (criticalEvents > 5 || staleControlPct > 30) healthStatus = 'critical';
  else if (criticalEvents > 0 || staleControlPct > 10 || avgCycleMs > 30000) healthStatus = 'degraded';

  const uptimeHours = lastCycleAt
    ? Math.round((Date.now() - new Date(lastCycleAt).getTime()) / 3600000 * 100) / 100
    : 0;

  return {
    cycleCount, avgCycleMs, enforcementRate, staleControlPct,
    telemetryIngestionRate, eventCount, criticalEvents,
    healthStatus, lastCycleAt, uptimeHours,
  };
}

// ── Snapshot persistence ───────────────────────────────────────────────────

export async function saveMetricsSnapshot(tenantId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  const metrics = await computeMetrics(tenantId);

  try {
    await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".agrc_metrics_snapshots (
        snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cycle_count INT DEFAULT 0, avg_cycle_ms INT DEFAULT 0,
        enforcement_rate DECIMAL(5,2) DEFAULT 0, stale_control_pct DECIMAL(5,2) DEFAULT 0,
        telemetry_ingestion_rate INT DEFAULT 0, event_count INT DEFAULT 0,
        critical_events INT DEFAULT 0, snapshot_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await safeQuery(
      `INSERT INTO "${schema}".agrc_metrics_snapshots
         (cycle_count, avg_cycle_ms, enforcement_rate, stale_control_pct,
          telemetry_ingestion_rate, event_count, critical_events)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [metrics.cycleCount, metrics.avgCycleMs, metrics.enforcementRate,
       metrics.staleControlPct, metrics.telemetryIngestionRate,
       metrics.eventCount, metrics.criticalEvents]
    );
  } catch { /* best effort */ }
}

export async function getMetricsHistory(tenantId: string, limit: number = 30): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".agrc_metrics_snapshots ORDER BY snapshot_at DESC LIMIT $1`, [limit]
    );
    return result.rows;
  } catch { return []; }
}

// ── Cleanup old snapshots ──────────────────────────────────────────────────

export async function purgeOldSnapshots(tenantId: string, retentionDays: number = 90): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await safeQuery(
      `DELETE FROM "${schema}".agrc_metrics_snapshots WHERE snapshot_at < $1`, [cutoff]
    );
    return result.rowCount || 0;
  } catch { return 0; }
}

// ── Cleanup old cycle logs ─────────────────────────────────────────────────

export async function purgeOldCycleLogs(tenantId: string, retentionDays: number = 90): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await safeQuery(
      `DELETE FROM "${schema}".agrc_os_cycle_log WHERE executed_at < $1`, [cutoff]
    );
    return result.rowCount || 0;
  } catch { return 0; }
}
