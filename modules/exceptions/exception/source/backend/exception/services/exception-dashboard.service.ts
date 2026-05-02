/**
 * ExceptionDashboardService -- Enterprise Exception Dashboard
 * ====================================================
 * Aggregates exception health, trend data, status distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped exception tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner exception
 * @module exception
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Exception status breakdown counts. */
export interface ExceptionStatusCounts {
  pending: number;
  approved: number;
  expired: number;
  rejected: number;
}

/** Top-level dashboard summary. */
export interface ExceptionDashboardSummary {
  tenantId: string;
  totalExceptions: number;
  byStatus: ExceptionStatusCounts;
}

/** Health score result. */
export interface ExceptionHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  expiredExceptions: number;
  pendingReviews: number;
  evaluatedAt: string;
}

/** Daily trend data point. */
export interface ExceptionTrendDataPoint {
  date: string;
  exceptionsCreated: number;
  exceptionsApproved: number;
  exceptionsExpired: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class ExceptionDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: total exceptions by
   * status (pending/approved/expired/rejected).
   */
  async getDashboardSummary(tenantId: string): Promise<ExceptionDashboardSummary> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM "${schema}".exceptions`,
    ).catch(() => ({
      rows: [{ total: 0, pending: 0, approved: 0, expired: 0, rejected: 0 }],
    }));

    const r = rows[0] ?? {};

    return {
      tenantId,
      totalExceptions: parseInt(r.total ?? '0', 10),
      byStatus: {
        pending: parseInt(r.pending ?? '0', 10),
        approved: parseInt(r.approved ?? '0', 10),
        expired: parseInt(r.expired ?? '0', 10),
        rejected: parseInt(r.rejected ?? '0', 10),
      },
    };
  }

  /**
   * Compute a health score (0-100) based on exception posture.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -15 per expired exception still not addressed (capped at -45)
   *   - Penalty: -5 per pending review older than 7 days (capped at -30)
   * Clamped to [0, 100].
   */
  async getExceptionHealth(tenantId: string): Promise<ExceptionHealth> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_exceptions,
         COUNT(*) FILTER (
           WHERE status = 'pending'
             AND created_at < NOW() - INTERVAL '7 days'
         )::int AS stale_pending
       FROM "${schema}".exceptions`,
    ).catch(() => ({
      rows: [{ expired_exceptions: 0, stale_pending: 0 }],
    }));

    const row = rows[0] ?? {};
    const expiredExceptions = parseInt(row.expired_exceptions ?? '0', 10);
    const pendingReviews = parseInt(row.stale_pending ?? '0', 10);

    // Health score algorithm
    let healthScore = 100;
    healthScore -= Math.min(expiredExceptions * 15, 45);
    healthScore -= Math.min(pendingReviews * 5, 30);
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Grade mapping
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (healthScore >= 90) grade = 'A';
    else if (healthScore >= 75) grade = 'B';
    else if (healthScore >= 60) grade = 'C';
    else if (healthScore >= 40) grade = 'D';
    else grade = 'F';

    return {
      tenantId,
      healthScore,
      grade,
      expiredExceptions,
      pendingReviews,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Produce daily trend data for the specified number of days.
   * Each data point includes exceptions created, approved, and expired.
   */
  async getExceptionTrend(tenantId: string, days: number): Promise<ExceptionTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    const { rows } = await safeQuery(
      `WITH date_range AS (
         SELECT d::date AS date
         FROM generate_series(
           (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
           CURRENT_DATE,
           '1 day'::interval
         ) AS d
       ),
       created AS (
         SELECT created_at::date AS day, COUNT(*)::int AS cnt
         FROM "${schema}".exceptions
         WHERE created_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
         GROUP BY created_at::date
       ),
       approved AS (
         SELECT updated_at::date AS day, COUNT(*)::int AS cnt
         FROM "${schema}".exceptions
         WHERE status = 'approved'
           AND updated_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
         GROUP BY updated_at::date
       ),
       expired AS (
         SELECT updated_at::date AS day, COUNT(*)::int AS cnt
         FROM "${schema}".exceptions
         WHERE status = 'expired'
           AND updated_at >= CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day'
         GROUP BY updated_at::date
       )
       SELECT
         dr.date::text AS date,
         COALESCE(c.cnt, 0) AS exceptions_created,
         COALESCE(a.cnt, 0) AS exceptions_approved,
         COALESCE(x.cnt, 0) AS exceptions_expired
       FROM date_range dr
       LEFT JOIN created c ON c.day = dr.date
       LEFT JOIN approved a ON a.day = dr.date
       LEFT JOIN expired x ON x.day = dr.date
       ORDER BY dr.date ASC`,
      [safeDays],
    ).catch(() => ({ rows: [] }));

    return rows.map((r: Record<string, unknown>) => ({
      date: r.date,
      exceptionsCreated: parseInt((r as any).exceptions_created ?? '0', 10),
      exceptionsApproved: parseInt((r as any).exceptions_approved ?? '0', 10),
      exceptionsExpired: parseInt((r as any).exceptions_expired ?? '0', 10),
    }));
  }
}
