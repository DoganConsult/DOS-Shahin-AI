// Vendor engagement-score service — backed by dos.vendor_engagement_scores.
// Tracks the engagement-score history per (tenant, vendor) for the
// enforcement-gate service to consult before allowing privileged vendor
// operations. The score is a numeric 0..100 derived from on-time delivery,
// SLA adherence, NCR rate, and consultant satisfaction signals.

import { safeQuery } from '@dos/db';

export interface EngagementScorePoint {
  tenantId: string;
  vendorId: string;
  score: number;
  recordedAt: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Read the most recent N engagement-score points for a vendor, newest first.
 * Returns an empty array when the table is missing or no rows exist —
 * callers MUST treat empty as "no signal" and not as "passing".
 */
export async function getScoreHistory(
  tenantId: string,
  vendorId: string,
  limit: number = 20,
): Promise<EngagementScorePoint[]> {
  const cap = Math.min(200, Math.max(1, limit));
  try {
    const r = await safeQuery(
      `SELECT tenant_id, vendor_id, score, recorded_at, source, metadata
         FROM dos.vendor_engagement_scores
        WHERE tenant_id = $1 AND vendor_id = $2
        ORDER BY recorded_at DESC
        LIMIT $3`,
      [tenantId, vendorId, cap],
    );
    return (r.rows as Record<string, unknown>[]).map((row) => ({
      tenantId: row['tenant_id'] as string,
      vendorId: row['vendor_id'] as string,
      score: Number(row['score'] ?? 0),
      recordedAt: row['recorded_at'] as string,
      source: (row['source'] as string) ?? undefined,
      metadata: (row['metadata'] as Record<string, unknown>) ?? {},
    }));
  } catch {
    return [];
  }
}

export interface EngagementScoreSummary {
  current: number | null;
  rolling7d: number | null;
  rolling30d: number | null;
  trend: 'up' | 'down' | 'flat' | 'unknown';
  pointsCount: number;
}

export async function getScoreSummary(
  tenantId: string,
  vendorId: string,
): Promise<EngagementScoreSummary> {
  const history = await getScoreHistory(tenantId, vendorId, 60);
  if (history.length === 0) {
    return { current: null, rolling7d: null, rolling30d: null, trend: 'unknown', pointsCount: 0 };
  }
  const now = Date.now();
  const within = (days: number) =>
    history.filter((p) => now - new Date(p.recordedAt).getTime() <= days * 86_400_000);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const w7 = within(7).map((p) => p.score);
  const w30 = within(30).map((p) => p.score);
  const current = history[0].score;
  const earlier = history[Math.min(history.length - 1, 5)].score;
  const trend: EngagementScoreSummary['trend'] =
    Math.abs(current - earlier) < 0.5 ? 'flat' : current > earlier ? 'up' : 'down';
  return {
    current,
    rolling7d: avg(w7),
    rolling30d: avg(w30),
    trend,
    pointsCount: history.length,
  };
}

export async function recordScore(point: Omit<EngagementScorePoint, 'recordedAt'>): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO dos.vendor_engagement_scores
         (tenant_id, vendor_id, score, source, metadata, recorded_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW())`,
      [
        point.tenantId,
        point.vendorId,
        point.score,
        point.source ?? null,
        JSON.stringify(point.metadata ?? {}),
      ],
    );
  } catch {
    // table absent — score will be re-recorded on the next cycle
  }
}
