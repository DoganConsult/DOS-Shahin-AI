/**
 * quality-gate — Dashboard Aggregation Service
 * Provides summary, trends, and health data for admin dashboard widgets.
 * All queries are tenant-scoped.
 */

import { safeQuery, tenantSchema, assertTenantId } from '../ports/database.port';
import type { QgateDashboardSummaryDTO, QgateTrendPointDTO, QgateHealthStatusDTO } from '../types/quality-gate.dto';
import type { QgateRunStatus, QgateStageCode } from '../types/quality-gate.types';

const STAGE_CODES: QgateStageCode[] = ['devsecops', 'unit', 'integration', 'ai-guardrails', 'e2e-visual', 'performance', 'mutation'];

export async function getDashboardSummary(tenantId: string): Promise<QgateDashboardSummaryDTO> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  // Latest run
  const latestRun = await safeQuery(
    `SELECT * FROM "${schema}".qgate_runs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [tenantId],
  );

  // Pass rate 30d
  const stats30d = await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'passed') AS passed
     FROM "${schema}".qgate_runs
     WHERE tenant_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
    [tenantId],
  );
  const total30d = Number(stats30d.rows[0]?.total ?? 0);
  const passRate30d = total30d > 0 ? Number(stats30d.rows[0]?.passed ?? 0) / total30d : 0;

  // Latest AI guardrail overall score
  const aiScore = await safeQuery(
    `SELECT AVG(score) AS avg_score FROM "${schema}".qgate_ai_eval_scores
     WHERE tenant_id = $1 AND run_id = (
       SELECT run_id FROM "${schema}".qgate_runs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1
     )`,
    [tenantId],
  );

  // Schema drift counts
  const driftCounts = await safeQuery(
    `SELECT severity, COUNT(*) AS cnt FROM "${schema}".qgate_schema_drift_log
     WHERE tenant_id = $1 AND resolved = false GROUP BY severity`,
    [tenantId],
  );
  const driftMap: Record<string, number> = {};
  for (const r of driftCounts.rows) driftMap[r.severity as string] = Number(r.cnt);

  // Latest mutation score
  const mutScore = await safeQuery(
    `SELECT AVG(mutation_score) AS avg_score FROM "${schema}".qgate_mutation_reports
     WHERE tenant_id = $1 AND run_id = (
       SELECT run_id FROM "${schema}".qgate_runs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1
     )`,
    [tenantId],
  );

  // Stage health (latest status per stage)
  const stageHealth = await safeQuery(
    `SELECT DISTINCT ON (stage_code) stage_code, status, score
     FROM "${schema}".qgate_stage_results
     WHERE tenant_id = $1
     ORDER BY stage_code, created_at DESC`,
    [tenantId],
  );

  return {
    latestRun: latestRun.rows[0] ?? null,
    passRate30d,
    totalRuns30d: total30d,
    aiGuardrailScore: aiScore.rows[0]?.avg_score != null ? Number(aiScore.rows[0].avg_score) : null,
    schemaDriftCount: {
      critical: driftMap['critical'] ?? 0,
      warning: driftMap['warning'] ?? 0,
      info: driftMap['info'] ?? 0,
    },
    mutationScore: mutScore.rows[0]?.avg_score != null ? Number(mutScore.rows[0].avg_score) : null,
    stageHealth: stageHealth.rows.map(r => ({
      stageCode: r.stage_code as QgateStageCode,
      lastStatus: r.status as QgateRunStatus,
      lastScore: r.score != null ? Number(r.score) : null,
    })),
  };
}

export async function getDashboardTrends(tenantId: string, days = 30): Promise<QgateTrendPointDTO[]> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       DATE(created_at) AS date,
       AVG(overall_score) AS avg_score
     FROM "${schema}".qgate_runs
     WHERE tenant_id = $1 AND created_at > NOW() - make_interval(days => $2)
     GROUP BY DATE(created_at)
     ORDER BY date`,
    [tenantId, days],
  );

  return result.rows.map(r => ({
    date: String(r.date),
    overallScore: r.avg_score != null ? Number(r.avg_score) : null,
    stageScores: {} as Record<QgateStageCode, number | null>,
  }));
}

export async function getDashboardHealth(tenantId: string): Promise<QgateHealthStatusDTO> {
  assertTenantId(tenantId);
  const schema = tenantSchema(tenantId);

  const stages: QgateHealthStatusDTO['stages'] = [];

  for (const stageCode of STAGE_CODES) {
    const result = await safeQuery(
      `SELECT status, created_at FROM "${schema}".qgate_stage_results
       WHERE tenant_id = $1 AND stage_code = $2
       ORDER BY created_at DESC LIMIT 5`,
      [tenantId, stageCode],
    );

    const rows = result.rows;
    const consecutiveFailures = rows.findIndex(r => r.status === 'passed');
    const lastRunAt = rows[0]?.created_at as string | null ?? null;
    const healthy = rows.length > 0 && rows[0]?.status === 'passed';

    stages.push({
      stageCode,
      healthy,
      lastRunAt,
      consecutiveFailures: consecutiveFailures === -1 ? rows.length : consecutiveFailures,
      alertLevel: !healthy && consecutiveFailures >= 3 ? 'critical' : !healthy ? 'warn' : 'ok',
    });
  }

  return { stages };
}
