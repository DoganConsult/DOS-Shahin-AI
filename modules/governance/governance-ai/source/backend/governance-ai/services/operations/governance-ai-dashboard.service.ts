import { safeQuery, tenantSchema, emptyResult } from '../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export interface GovernanceAiDashboardSummary {
  tenantId: string;
  generatedAt: string;
  signalCounts: { total: number; critical: number; high: number; medium: number; low: number };
  statusBreakdown: Record<string, number>;
  recentPipelineRuns: number;
  pendingInterpretations: number;
  activeEscalations: number;
  openRecommendations: number;
}

export class GovernanceAiDashboardService {
  async getSummary(tenantId: string): Promise<GovernanceAiDashboardSummary> {
    const schema = tenantSchema(tenantId);
    const [signalRes, statusRes, pipelineRes, interpRes, escalRes, recRes] = await Promise.all([
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
           COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
           COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
           COUNT(*) FILTER (WHERE severity = 'low')::int AS low
         FROM "${schema}".governance_signals WHERE status NOT IN ('resolved', 'dismissed', 'archived')`,
      ), { tenantId, operation: 'dashboard.signalCounts' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT status, COUNT(*)::int AS count FROM "${schema}".governance_signals GROUP BY status`,
      ), { tenantId, operation: 'dashboard.statusBreakdown' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT COUNT(*)::int AS count FROM "${schema}".governance_ai_runs WHERE created_at >= NOW() - INTERVAL '7 days'`,
      ), { tenantId, operation: 'dashboard.pipelineRuns' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT COUNT(*)::int AS count FROM "${schema}".governance_signals WHERE status = 'detected'`,
      ), { tenantId, operation: 'dashboard.pendingInterp' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT COUNT(*)::int AS count FROM "${schema}".governance_escalation_events WHERE status NOT IN ('closed', 'resolved')`,
      ), { tenantId, operation: 'dashboard.escalations' }),
      swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT COUNT(*)::int AS count FROM "${schema}".governance_recommendations WHERE accepted_status IN ('drafted', 'pending_review')`,
      ), { tenantId, operation: 'dashboard.recommendations' }),
    ]);

    const sigRow = signalRes.rows[0] || { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    const statusBreakdown: Record<string, number> = {};

    for (const row of statusRes.rows) { statusBreakdown[(row as any).status] = row.count; }

    return {
      tenantId,
      generatedAt: new Date().toISOString(),

      signalCounts: { total: sigRow.total, critical: sigRow.critical, high: sigRow.high, medium: sigRow.medium, low: sigRow.low },
      statusBreakdown,

      recentPipelineRuns: pipelineRes.rows[0]?.count ?? 0,

      pendingInterpretations: interpRes.rows[0]?.count ?? 0,

      activeEscalations: escalRes.rows[0]?.count ?? 0,

      openRecommendations: recRes.rows[0]?.count ?? 0,
    };
  }
}
