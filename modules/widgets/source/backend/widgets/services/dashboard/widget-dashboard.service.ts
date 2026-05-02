/**
 * WidgetDashboardService -- Enterprise Widget Dashboard Aggregation
 * ==================================================================
 * Aggregates widget registry health, render performance, bundle usage,
 * data freshness, and overall widget ecosystem health scoring for
 * operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-schema tables:
 *   - widgets_registry
 *   - widgets_bundles
 *   - widgets_render_log
 *
 * @owner widgets
 * @module widgets
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Top-level dashboard summary for the widgets module. */
export interface WidgetDashboardSummary {
  tenantId: string;
  totalWidgets: number;
  publishedWidgets: number;
  draftWidgets: number;
  suspendedWidgets: number;
  archivedWidgets: number;
  totalBundles: number;
  publishedBundles: number;
  recentlyCreated: number;
  widgetsByCategory: { category: string; count: number }[];
}

/** Widget ecosystem health assessment result. */
export interface WidgetHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  publishedWidgetCount: number;
  suspendedWidgetCount: number;
  staleDrafts: number;
  renderErrorRate: number;
  avgRenderLatencyMs: number;
  areasOfConcern: string[];
  evaluatedAt: string;
}

/** A single data point in the widget render trend series. */
export interface WidgetRenderTrendDataPoint {
  date: string;
  totalRenders: number;
  failedRenders: number;
  avgDurationMs: number;
  uniqueWidgets: number;
}

/** Per-widget usage summary. */
export interface WidgetUsageSummary {
  widgetId: string;
  widgetKey: string;
  nameEn: string;
  category: string;
  status: string;
  totalRenders: number;
  avgDurationMs: number;
  errorRate: number;
  lastRenderedAt: string | null;
}

/** Data freshness overview. */
export interface DataFreshnessSummary {
  tenantId: string;
  totalWidgets: number;
  staleWidgets: number;
  freshWidgets: number;
  averageDataAgeMinutes: number;
  widgetsNeverRendered: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class WidgetDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: widget counts by status,
   * bundle counts, recently created, and category breakdown.
   */
  async getDashboardSummary(tenantId: string): Promise<WidgetDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      // Widget aggregates by status
      const widgetResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'published')::int AS published,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
           COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_created
         FROM "${schema}".widgets_registry
         WHERE deleted_at IS NULL`,
      ).catch(() => ({
        rows: [{ total: 0, published: 0, draft: 0, suspended: 0, archived: 0, recently_created: 0 }],
      }));

      const wRow = widgetResult.rows[0] ?? {};

      // Bundle aggregates
      const bundleResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'published')::int AS published
         FROM "${schema}".widgets_bundles
         WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, published: 0 }] }));

      const bRow = bundleResult.rows[0] ?? {};

      // Widgets by category
      const categoryResult = await safeQuery(
        `SELECT
           COALESCE(category, 'general') AS category,
           COUNT(*)::int AS count
         FROM "${schema}".widgets_registry
         WHERE deleted_at IS NULL
         GROUP BY category
         ORDER BY count DESC`,
      ).catch(() => ({ rows: [] }));

      const widgetsByCategory = (categoryResult.rows as Record<string, unknown>[]).map((r) => ({
        category: r.category,
        count: parseInt((r as any).count ?? '0', 10),
      }));

      return {
        tenantId,
        totalWidgets: parseInt(wRow.total ?? '0', 10),
        publishedWidgets: parseInt(wRow.published ?? '0', 10),
        draftWidgets: parseInt(wRow.draft ?? '0', 10),
        suspendedWidgets: parseInt(wRow.suspended ?? '0', 10),
        archivedWidgets: parseInt(wRow.archived ?? '0', 10),
        totalBundles: parseInt(bRow.total ?? '0', 10),
        publishedBundles: parseInt(bRow.published ?? '0', 10),
        recentlyCreated: parseInt(wRow.recently_created ?? '0', 10),

        widgetsByCategory,
      };
    } catch {
      return {
        tenantId,
        totalWidgets: 0,
        publishedWidgets: 0,
        draftWidgets: 0,
        suspendedWidgets: 0,
        archivedWidgets: 0,
        totalBundles: 0,
        publishedBundles: 0,
        recentlyCreated: 0,
        widgetsByCategory: [],
      };
    }
  }

  /**
   * Compute a widget ecosystem health score (0-100) and letter grade.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -10 per suspended widget (capped at -30)
   *   - Penalty: -5 per stale draft (>30 days) (capped at -25)
   *   - Penalty: based on render error rate (>5% = -15, >10% = -25)
   *   - Penalty: based on avg render latency (>2s = -10, >5s = -20)
   */
  async getWidgetHealth(tenantId: string): Promise<WidgetHealth> {
    const schema = tenantSchema(tenantId);

    try {
      // Widget status aggregates
      const statusResult = await safeQuery(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'published')::int AS published_count,
           COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended_count,
           COUNT(*) FILTER (
             WHERE status = 'draft'
               AND created_at < NOW() - INTERVAL '30 days'
           )::int AS stale_drafts
         FROM "${schema}".widgets_registry
         WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ published_count: 0, suspended_count: 0, stale_drafts: 0 }] }));

      const sRow = statusResult.rows[0] ?? {};
      const publishedCount = parseInt(sRow.published_count ?? '0', 10);
      const suspendedCount = parseInt(sRow.suspended_count ?? '0', 10);
      const staleDrafts = parseInt(sRow.stale_drafts ?? '0', 10);

      // Render performance (last 24 hours)
      const renderResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total_renders,
           COUNT(*) FILTER (WHERE NOT success)::int AS failed_renders,
           COALESCE(AVG(duration_ms), 0)::int AS avg_duration_ms
         FROM "${schema}".widgets_render_log
         WHERE rendered_at > NOW() - INTERVAL '24 hours'`,
      ).catch(() => ({ rows: [{ total_renders: 0, failed_renders: 0, avg_duration_ms: 0 }] }));

      const rRow = renderResult.rows[0] ?? {};
      const totalRenders = parseInt(rRow.total_renders ?? '0', 10);
      const failedRenders = parseInt(rRow.failed_renders ?? '0', 10);
      const avgDurationMs = parseInt(rRow.avg_duration_ms ?? '0', 10);
      const renderErrorRate = totalRenders > 0
        ? Math.round((failedRenders / totalRenders) * 10000) / 100
        : 0;

      // Calculate health score
      let healthScore = 100;

      // Penalty for suspended widgets: -10 each, max -30
      healthScore -= Math.min(suspendedCount * 10, 30);

      // Penalty for stale drafts: -5 each, max -25
      healthScore -= Math.min(staleDrafts * 5, 25);

      // Penalty for render error rate
      if (renderErrorRate > 10) {
        healthScore -= 25;
      } else if (renderErrorRate > 5) {
        healthScore -= 15;
      }

      // Penalty for high render latency
      if (avgDurationMs > 5000) {
        healthScore -= 20;
      } else if (avgDurationMs > 2000) {
        healthScore -= 10;
      }

      healthScore = Math.max(0, Math.min(100, healthScore));

      // Identify areas of concern
      const areasOfConcern: string[] = [];
      if (suspendedCount > 0) {
        areasOfConcern.push(`${suspendedCount} widget(s) are suspended`);
      }
      if (staleDrafts > 0) {
        areasOfConcern.push(`${staleDrafts} widget(s) stuck in draft for >30 days`);
      }
      if (renderErrorRate > 5) {
        areasOfConcern.push(`Render error rate is ${renderErrorRate.toFixed(1)}% (target: <5%)`);
      }
      if (avgDurationMs > 2000) {
        areasOfConcern.push(`Average render latency is ${avgDurationMs}ms (target: <2000ms)`);
      }
      if (publishedCount === 0) {
        areasOfConcern.push('No published widgets available');
      }

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
        publishedWidgetCount: publishedCount,
        suspendedWidgetCount: suspendedCount,
        staleDrafts,
        renderErrorRate,
        avgRenderLatencyMs: avgDurationMs,
        areasOfConcern,
        evaluatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        tenantId,
        healthScore: 0,
        grade: 'F',
        publishedWidgetCount: 0,
        suspendedWidgetCount: 0,
        staleDrafts: 0,
        renderErrorRate: 0,
        avgRenderLatencyMs: 0,
        areasOfConcern: ['Unable to evaluate widget health -- data unavailable'],
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Produce daily render trend data using generate_series over the
   * widgets_render_log table, providing total renders, failures,
   * average duration, and unique widget count per day.
   */
  async getRenderTrend(tenantId: string, days: number): Promise<WidgetRenderTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    try {
      const result = await safeQuery(
        `SELECT
           d.date::date::text AS date,
           COALESCE(r.total_renders, 0)::int AS total_renders,
           COALESCE(r.failed_renders, 0)::int AS failed_renders,
           COALESCE(r.avg_duration_ms, 0)::int AS avg_duration_ms,
           COALESCE(r.unique_widgets, 0)::int AS unique_widgets
         FROM generate_series(
           (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
           CURRENT_DATE,
           '1 day'::interval
         ) AS d(date)
         LEFT JOIN (
           SELECT
             rendered_at::date AS dt,
             COUNT(*)::int AS total_renders,
             COUNT(*) FILTER (WHERE NOT success)::int AS failed_renders,
             AVG(duration_ms)::int AS avg_duration_ms,
             COUNT(DISTINCT widget_key)::int AS unique_widgets
           FROM "${schema}".widgets_render_log
           GROUP BY rendered_at::date
         ) r ON r.dt = d.date::date
         ORDER BY d.date ASC`,
        [safeDays],
      ).catch(() => ({ rows: [] }));

      return (result.rows as Record<string, unknown>[]).map((r) => ({
        date: r.date,
        totalRenders: parseInt((r as any).total_renders ?? '0', 10),
        failedRenders: parseInt((r as any).failed_renders ?? '0', 10),
        avgDurationMs: parseInt((r as any).avg_duration_ms ?? '0', 10),
        uniqueWidgets: parseInt((r as any).unique_widgets ?? '0', 10),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Retrieve per-widget usage statistics: render count, avg duration,
   * error rate, and last rendered timestamp.
   */
  async getWidgetUsageStats(tenantId: string): Promise<WidgetUsageSummary[]> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           w.widget_id,
           w.widget_key,
           w.name_en,
           w.category,
           w.status,
           COALESCE(r.total_renders, 0)::int AS total_renders,
           COALESCE(r.avg_duration_ms, 0)::int AS avg_duration_ms,
           CASE WHEN COALESCE(r.total_renders, 0) > 0
             THEN ROUND((COALESCE(r.failed_renders, 0)::numeric / r.total_renders) * 100, 2)
             ELSE 0
           END AS error_rate,
           r.last_rendered_at
         FROM "${schema}".widgets_registry w
         LEFT JOIN (
           SELECT
             widget_key,
             COUNT(*)::int AS total_renders,
             COUNT(*) FILTER (WHERE NOT success)::int AS failed_renders,
             AVG(duration_ms)::int AS avg_duration_ms,
             MAX(rendered_at) AS last_rendered_at
           FROM "${schema}".widgets_render_log
           GROUP BY widget_key
         ) r ON r.widget_key = w.widget_key
         WHERE w.deleted_at IS NULL
         ORDER BY COALESCE(r.total_renders, 0) DESC`,
      ).catch(() => ({ rows: [] }));

      return (result.rows as Record<string, unknown>[]).map((r) => ({
        widgetId: r.widget_id,
        widgetKey: r.widget_key,
        nameEn: r.name_en,
        category: r.category,
        status: r.status,
        totalRenders: parseInt((r as any).total_renders ?? '0', 10),
        avgDurationMs: parseInt((r as any).avg_duration_ms ?? '0', 10),
        errorRate: parseFloat((r as any).error_rate ?? '0'),

        lastRenderedAt: r.last_rendered_at?.toISOString?.() ?? r.last_rendered_at ?? null,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Assess data freshness across all widgets by checking the recency
   * of render log entries. Widgets not rendered in the last 24 hours
   * are considered stale.
   */
  async getDataFreshness(tenantId: string): Promise<DataFreshnessSummary> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           COUNT(DISTINCT w.widget_id)::int AS total_widgets,
           COUNT(DISTINCT w.widget_id) FILTER (
             WHERE r.last_rendered IS NOT NULL
               AND r.last_rendered > NOW() - INTERVAL '24 hours'
           )::int AS fresh_widgets,
           COUNT(DISTINCT w.widget_id) FILTER (
             WHERE r.last_rendered IS NOT NULL
               AND r.last_rendered <= NOW() - INTERVAL '24 hours'
           )::int AS stale_widgets,
           COUNT(DISTINCT w.widget_id) FILTER (
             WHERE r.last_rendered IS NULL
           )::int AS never_rendered,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (NOW() - r.last_rendered)) / 60)
             FILTER (WHERE r.last_rendered IS NOT NULL),
             0
           )::int AS avg_data_age_minutes
         FROM "${schema}".widgets_registry w
         LEFT JOIN (
           SELECT widget_key, MAX(rendered_at) AS last_rendered
           FROM "${schema}".widgets_render_log
           GROUP BY widget_key
         ) r ON r.widget_key = w.widget_key
         WHERE w.deleted_at IS NULL
           AND w.status = 'published'`,
      ).catch(() => ({
        rows: [{ total_widgets: 0, fresh_widgets: 0, stale_widgets: 0, never_rendered: 0, avg_data_age_minutes: 0 }],
      }));

      const row = result.rows[0] ?? {};

      return {
        tenantId,
        totalWidgets: parseInt(row.total_widgets ?? '0', 10),
        freshWidgets: parseInt(row.fresh_widgets ?? '0', 10),
        staleWidgets: parseInt(row.stale_widgets ?? '0', 10),
        averageDataAgeMinutes: parseInt(row.avg_data_age_minutes ?? '0', 10),
        widgetsNeverRendered: parseInt(row.never_rendered ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalWidgets: 0,
        freshWidgets: 0,
        staleWidgets: 0,
        averageDataAgeMinutes: 0,
        widgetsNeverRendered: 0,
      };
    }
  }
}
