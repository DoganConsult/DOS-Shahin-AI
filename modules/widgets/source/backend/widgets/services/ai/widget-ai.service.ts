/**
 * WidgetAIService -- AI-Powered Widget Intelligence
 * ====================================================
 * Provides AI-driven analysis and recommendations for widget operations:
 *   - Smart widget recommendations based on user role and data patterns
 *   - Data anomaly detection across widget data sources
 *   - Trend narrative generation for executive widget summaries
 *   - Widget layout optimization suggestions
 *
 * Uses Claude via the canonical client at config/claude-client.
 *
 * @owner widgets
 * @module widgets
 * @since 2026-03-31
 */

import { logger } from '../../ports/logger.port';
import { emitEvent } from '../../ports/events.port';
import { SYSTEM_JOB_ACTOR } from '../../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ── Types ──────────────────────────────────────────────────────────────────

/** AI-generated widget recommendation result. */
export interface WidgetRecommendation {
  tenantId: string;
  recommendedWidgets: { widgetKey: string; reason: string; priority: 'high' | 'medium' | 'low' }[];
  layoutSuggestion: string;
  unusedWidgets: string[];
  aiGenerated: boolean;
  generatedAt: string;
}

/** AI-generated data anomaly detection result. */
export interface DataAnomalyResult {
  tenantId: string;
  anomalies: {
    widgetKey: string;
    anomalyType: 'spike' | 'drop' | 'pattern_break' | 'stale_data' | 'error_surge';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }[];
  overallAssessment: string;
  aiGenerated: boolean;
  generatedAt: string;
}

/** AI-generated trend narrative for executive consumption. */
export interface TrendNarrative {
  tenantId: string;
  narrative: string;
  keyInsights: string[];
  riskIndicators: string[];
  positiveSignals: string[];
  aiGenerated: boolean;
  generatedAt: string;
}

/** AI-generated layout optimization suggestion. */
export interface LayoutOptimization {
  tenantId: string;
  currentWidgetCount: number;
  suggestions: {
    action: 'add' | 'remove' | 'reorder' | 'resize';
    widgetKey: string;
    reason: string;
  }[];
  overallAdvice: string;
  aiGenerated: boolean;
  generatedAt: string;
}

// ── Service ────────────────────────────────────────────────────────────────

export class WidgetAIService {
  /**
   * Generate AI-powered widget recommendations for a tenant.
   * Gathers widget usage data and suggests improvements.
   */
  async recommendWidgets(tenantId: string): Promise<WidgetRecommendation> {
    const fallback: WidgetRecommendation = {
      tenantId,
      recommendedWidgets: [],
      layoutSuggestion: 'Unable to generate AI recommendations. Review widget dashboard manually.',
      unusedWidgets: [],
      aiGenerated: false,
      generatedAt: new Date().toISOString(),
    };

    try {
      const widgetData = await this.gatherWidgetData(tenantId);
      if (!widgetData || widgetData.totalWidgets === 0) {
        return fallback;
      }

      const { createChatCompletion } = await import('../../../../config/claude-client.js');

      const result = await createChatCompletion(
        [
          {
            role: 'user',
            content: `Analyze the following widget ecosystem data and recommend improvements.

Widget Statistics:
- Total Widgets: ${widgetData.totalWidgets}
- Published: ${widgetData.publishedWidgets}
- Draft: ${widgetData.draftWidgets}
- Suspended: ${widgetData.suspendedWidgets}

Widget Categories: ${widgetData.categories.join(', ') || 'None'}

Active Widgets (by usage):
${widgetData.topWidgets.map((w: any) => `- ${w.widgetKey}: ${w.totalRenders} renders, ${w.errorRate}% error rate`).join('\n') || 'No usage data available'}

Unused Widgets (no renders in 7 days):
${widgetData.unusedWidgets.join(', ') || 'None'}

Total Bundles: ${widgetData.totalBundles}

Provide your response as JSON with these fields:
- recommendedWidgets: Array of { widgetKey: string, reason: string, priority: "high"|"medium"|"low" }
- layoutSuggestion: string (advice on dashboard layout)
- unusedWidgets: string[] (widgets that should be reviewed or removed)`,
          },
        ],
        {
          system: 'You are a GRC dashboard analytics expert. Analyze widget usage data and provide actionable recommendations for improving dashboard effectiveness. Always respond with valid JSON only.',
          temperature: 0.3,
          maxTokens: 1024,
        },
      );

      if (!result) return fallback;

      const parsed = this.safeJsonParse(result.content);
      await this.logAIUsage(tenantId, 'recommendWidgets', result.usage);

      return {
        tenantId,
        recommendedWidgets: Array.isArray(parsed.recommendedWidgets) ? parsed.recommendedWidgets : [],

        layoutSuggestion: parsed.layoutSuggestion ?? fallback.layoutSuggestion,
        unusedWidgets: Array.isArray(parsed.unusedWidgets) ? parsed.unusedWidgets : [],
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('[widget-ai] recommendWidgets failed, returning fallback', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  }

  /**
   * Detect data anomalies across widget render logs and data sources.
   * Identifies spikes, drops, pattern breaks, stale data, and error surges.
   */
  async detectAnomalies(tenantId: string): Promise<DataAnomalyResult> {
    const fallback: DataAnomalyResult = {
      tenantId,
      anomalies: [],
      overallAssessment: 'Unable to generate AI anomaly detection. Review render logs manually.',
      aiGenerated: false,
      generatedAt: new Date().toISOString(),
    };

    try {
      const renderData = await this.gatherRenderData(tenantId);
      if (!renderData || renderData.recentRenders === 0) {
        return fallback;
      }

      const { createChatCompletion } = await import('../../../../config/claude-client.js');

      const result = await createChatCompletion(
        [
          {
            role: 'user',
            content: `Analyze the following widget render data and identify anomalies.

Render Statistics (last 24 hours):
- Total Renders: ${renderData.recentRenders}
- Failed Renders: ${renderData.failedRenders}
- Error Rate: ${renderData.errorRate}%
- Avg Duration: ${renderData.avgDurationMs}ms
- Max Duration: ${renderData.maxDurationMs}ms

Per-Widget Render Summary:
${renderData.perWidget.map((w: any) => `- ${w.widgetKey}: ${w.renders} renders, ${w.failures} failures, avg ${w.avgMs}ms`).join('\n') || 'No per-widget data'}

Widgets with high error rate (>10%):
${renderData.highErrorWidgets.join(', ') || 'None'}

Widgets with high latency (>3s avg):
${renderData.highLatencyWidgets.join(', ') || 'None'}

Provide your response as JSON with these fields:
- anomalies: Array of { widgetKey: string, anomalyType: "spike"|"drop"|"pattern_break"|"stale_data"|"error_surge", severity: "critical"|"high"|"medium"|"low", description: string, recommendation: string }
- overallAssessment: string (2-3 sentence summary of data quality)`,
          },
        ],
        {
          system: 'You are a data quality monitoring expert. Identify anomalies in widget render data and provide severity assessments with actionable recommendations. Always respond with valid JSON only.',
          temperature: 0.2,
          maxTokens: 1024,
        },
      );

      if (!result) return fallback;

      const parsed = this.safeJsonParse(result.content);
      await this.logAIUsage(tenantId, 'detectAnomalies', result.usage);

      const validTypes = ['spike', 'drop', 'pattern_break', 'stale_data', 'error_surge'] as const;
      const validSeverities = ['critical', 'high', 'medium', 'low'] as const;

      const anomalies = Array.isArray(parsed.anomalies)
        ? parsed.anomalies.map((a: Record<string, unknown>) => ({
            widgetKey: String(a.widgetKey ?? 'unknown'),
            anomalyType: validTypes.includes((a as any).anomalyType) ? a.anomalyType : 'pattern_break',
            severity: validSeverities.includes((a as any).severity) ? a.severity : 'medium',
            description: String(a.description ?? 'Anomaly detected'),
            recommendation: String(a.recommendation ?? 'Review widget data source'),
          }))
        : [];

      return {
        tenantId,

        anomalies,

        overallAssessment: parsed.overallAssessment ?? fallback.overallAssessment,
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('[widget-ai] detectAnomalies failed, returning fallback', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  }

  /**
   * Generate an executive-friendly trend narrative summarizing widget
   * data patterns, risk indicators, and positive signals.
   */
  async generateTrendNarrative(tenantId: string): Promise<TrendNarrative> {
    const fallback: TrendNarrative = {
      tenantId,
      narrative: 'Unable to generate trend narrative. Please review widget data manually.',
      keyInsights: [],
      riskIndicators: [],
      positiveSignals: [],
      aiGenerated: false,
      generatedAt: new Date().toISOString(),
    };

    try {
      const widgetData = await this.gatherWidgetData(tenantId);
      const renderData = await this.gatherRenderData(tenantId);

      if (!widgetData && !renderData) {
        return fallback;
      }

      const { createChatCompletion } = await import('../../../../config/claude-client.js');

      const result = await createChatCompletion(
        [
          {
            role: 'user',
            content: `Generate an executive summary narrative based on the following GRC widget data.

Widget Ecosystem:
- Total Widgets: ${widgetData?.totalWidgets ?? 0}
- Published: ${widgetData?.publishedWidgets ?? 0}
- Active Categories: ${widgetData?.categories?.join(', ') || 'None'}

Render Performance (last 24h):
- Total Renders: ${renderData?.recentRenders ?? 0}
- Error Rate: ${renderData?.errorRate ?? 0}%
- Avg Latency: ${renderData?.avgDurationMs ?? 0}ms

Most Used Widgets:
${widgetData?.topWidgets?.map((w: any) => `- ${w.widgetKey}: ${w.totalRenders} renders`).join('\n') || 'No data'}

Provide your response as JSON with these fields:
- narrative: string (3-5 sentence executive summary)
- keyInsights: string[] (3-5 key insights from the data)
- riskIndicators: string[] (items that need attention)
- positiveSignals: string[] (positive trends or achievements)`,
          },
        ],
        {
          system: 'You are an executive GRC reporting specialist. Generate clear, concise narratives that summarize complex widget data for C-suite audiences. Always respond with valid JSON only.',
          temperature: 0.4,
          maxTokens: 1024,
        },
      );

      if (!result) return fallback;

      const parsed = this.safeJsonParse(result.content);
      await this.logAIUsage(tenantId, 'generateTrendNarrative', result.usage);

      return {
        tenantId,

        narrative: parsed.narrative ?? fallback.narrative,
        keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
        riskIndicators: Array.isArray(parsed.riskIndicators) ? parsed.riskIndicators : [],
        positiveSignals: Array.isArray(parsed.positiveSignals) ? parsed.positiveSignals : [],
        aiGenerated: true,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn('[widget-ai] generateTrendNarrative failed, returning fallback', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      return fallback;
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Gather widget ecosystem data for AI analysis.
   */
  private async gatherWidgetData(tenantId: string): Promise<{
    totalWidgets: number;
    publishedWidgets: number;
    draftWidgets: number;
    suspendedWidgets: number;
    totalBundles: number;
    categories: string[];
    topWidgets: { widgetKey: string; totalRenders: number; errorRate: number }[];
    unusedWidgets: string[];
  } | null> {
    try {
      const { safeQuery, tenantSchema } = await import('../../../../config/database.js');
      const schema = tenantSchema(tenantId);

      // Widget status counts
      const statusResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'published')::int AS published,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended
         FROM "${schema}".widgets_registry
         WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0, published: 0, draft: 0, suspended: 0 }] }));

      const sRow = statusResult.rows[0] ?? {};

      // Bundle count
      const bundleResult = await safeQuery(
        `SELECT COUNT(*)::int AS total FROM "${schema}".widgets_bundles WHERE deleted_at IS NULL`,
      ).catch(() => ({ rows: [{ total: 0 }] }));

      // Categories
      const catResult = await safeQuery(
        `SELECT DISTINCT category FROM "${schema}".widgets_registry WHERE deleted_at IS NULL AND category IS NOT NULL`,
      ).catch(() => ({ rows: [] }));

      const categories = (catResult.rows as Record<string, unknown>[]).map((r) => r.category);

      // Top widgets by usage (last 7 days)
      const topResult = await safeQuery(
        `SELECT
           r.widget_key,
           COUNT(*)::int AS total_renders,
           CASE WHEN COUNT(*) > 0
             THEN ROUND((COUNT(*) FILTER (WHERE NOT r.success)::numeric / COUNT(*)) * 100, 1)
             ELSE 0
           END AS error_rate
         FROM "${schema}".widgets_render_log r
         WHERE r.rendered_at > NOW() - INTERVAL '7 days'
         GROUP BY r.widget_key
         ORDER BY total_renders DESC
         LIMIT 10`,
      ).catch(() => ({ rows: [] }));

      const topWidgets = (topResult.rows as Record<string, unknown>[]).map((r) => ({
        widgetKey: r.widget_key,
        totalRenders: parseInt((r as any).total_renders ?? '0', 10),
        errorRate: parseFloat((r as any).error_rate ?? '0'),
      }));

      // Unused widgets (published but no renders in 7 days)
      const unusedResult = await safeQuery(
        `SELECT w.widget_key
         FROM "${schema}".widgets_registry w
         WHERE w.deleted_at IS NULL
           AND w.status = 'published'
           AND NOT EXISTS (
             SELECT 1 FROM "${schema}".widgets_render_log r
             WHERE r.widget_key = w.widget_key
               AND r.rendered_at > NOW() - INTERVAL '7 days'
           )`,
      ).catch(() => ({ rows: [] }));

      const unusedWidgets = (unusedResult.rows as Record<string, unknown>[]).map((r) => r.widget_key);

      return {
        totalWidgets: parseInt(sRow.total ?? '0', 10),
        publishedWidgets: parseInt(sRow.published ?? '0', 10),
        draftWidgets: parseInt(sRow.draft ?? '0', 10),
        suspendedWidgets: parseInt(sRow.suspended ?? '0', 10),
        totalBundles: parseInt(bundleResult.rows[0]?.total ?? '0', 10),

        categories,

        topWidgets,

        unusedWidgets,
      };
    } catch (err) {
      logger.warn('[widget-ai] failed to gather widget data', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Gather render performance data for anomaly detection.
   */
  private async gatherRenderData(tenantId: string): Promise<{
    recentRenders: number;
    failedRenders: number;
    errorRate: number;
    avgDurationMs: number;
    maxDurationMs: number;
    perWidget: { widgetKey: string; renders: number; failures: number; avgMs: number }[];
    highErrorWidgets: string[];
    highLatencyWidgets: string[];
  } | null> {
    try {
      const { safeQuery, tenantSchema } = await import('../../../../config/database.js');
      const schema = tenantSchema(tenantId);

      // Overall render stats (last 24 hours)
      const overallResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE NOT success)::int AS failed,
           COALESCE(AVG(duration_ms), 0)::int AS avg_ms,
           COALESCE(MAX(duration_ms), 0)::int AS max_ms
         FROM "${schema}".widgets_render_log
         WHERE rendered_at > NOW() - INTERVAL '24 hours'`,
      ).catch(() => ({ rows: [{ total: 0, failed: 0, avg_ms: 0, max_ms: 0 }] }));

      const oRow = overallResult.rows[0] ?? {};
      const recentRenders = parseInt(oRow.total ?? '0', 10);
      const failedRenders = parseInt(oRow.failed ?? '0', 10);
      const errorRate = recentRenders > 0
        ? Math.round((failedRenders / recentRenders) * 10000) / 100
        : 0;

      // Per-widget breakdown
      const perWidgetResult = await safeQuery(
        `SELECT
           widget_key,
           COUNT(*)::int AS renders,
           COUNT(*) FILTER (WHERE NOT success)::int AS failures,
           COALESCE(AVG(duration_ms), 0)::int AS avg_ms
         FROM "${schema}".widgets_render_log
         WHERE rendered_at > NOW() - INTERVAL '24 hours'
         GROUP BY widget_key
         ORDER BY renders DESC`,
      ).catch(() => ({ rows: [] }));

      const perWidget = (perWidgetResult.rows as Record<string, unknown>[]).map((r) => ({
        widgetKey: r.widget_key,
        renders: parseInt((r as any).renders ?? '0', 10),
        failures: parseInt((r as any).failures ?? '0', 10),
        avgMs: parseInt((r as any).avg_ms ?? '0', 10),
      }));

      const highErrorWidgets = perWidget
        .filter((w) => w.renders > 0 && (w.failures / w.renders) > 0.1)
        .map((w) => w.widgetKey);

      const highLatencyWidgets = perWidget
        .filter((w) => w.avgMs > 3000)
        .map((w) => w.widgetKey);

      return {
        recentRenders,
        failedRenders,
        errorRate,
        avgDurationMs: parseInt(oRow.avg_ms ?? '0', 10),
        maxDurationMs: parseInt(oRow.max_ms ?? '0', 10),

        perWidget,

        highErrorWidgets,

        highLatencyWidgets,
      };
    } catch (err) {
      logger.warn('[widget-ai] failed to gather render data', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Safely parse JSON from AI response, returning empty object on failure.
   */
  private safeJsonParse(text: string): Record<string, unknown> {
    try {
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch { /* fallthrough */ }
      }
      return {};
    }
  }

  /**
   * Log AI usage for observability and cost tracking.
   */
  private async logAIUsage(
    tenantId: string,
    operation: string,
    usage: { inputTokens: number; outputTokens: number },
  ): Promise<void> {
    await emitEvent(({
          tenantId,
          userId: SYSTEM_JOB_ACTOR,
          module: 'widgets',
          event: 'widgets.ai.usage',
          entityType: 'widget',
          data: { operation, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
        } as any)).catch(catchHandler(EC.EVENT_BUS, {
          tenantId,
          operation: `widgets-ai:${operation}:usage`,
        }));
  }
}
