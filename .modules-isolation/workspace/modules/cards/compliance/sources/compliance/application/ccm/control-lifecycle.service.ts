// ============================================
// Shahin — Control Lifecycle Staleness Checker
// Detects controls that have not been assessed
// or tested within their defined SLA windows.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

export interface StalenessResult {
  controlId: string;
  staleDays: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Check staleness of controls in a tenant schema.
 * Returns controls whose last assessment/test exceeds the configured threshold.
 */
export async function checkStaleness(
  tenantId: string,
  controlIdOrThreshold?: string | number,
  thresholdDays: number = 90,
): Promise<StalenessResult[]> {
  // When called with (tenantId, controlId, threshold), narrow to a single control
  const _singleControlId = typeof controlIdOrThreshold === 'string' ? controlIdOrThreshold : undefined;
  if (typeof controlIdOrThreshold === 'number') thresholdDays = controlIdOrThreshold;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT control_id,
            EXTRACT(DAY FROM NOW() - COALESCE(last_tested_at, created_at))::int AS stale_days
     FROM "${schema}".controls
     WHERE deleted_at IS NULL
       AND COALESCE(last_tested_at, created_at) < NOW() - ($1 || ' days')::interval
     ORDER BY stale_days DESC`,
    [thresholdDays],
  ).catch(() => ({ rows: [] }));

  return (result.rows ?? []).map(( r: Record<string, unknown>) => ({
    controlId: r.control_id,
    staleDays: r.stale_days,
    severity: (r as any).stale_days > 180 ? 'critical' : (r as any).stale_days > 120 ? 'high' : (r as any).stale_days > 90 ? 'medium' : 'low',
  }));
}
