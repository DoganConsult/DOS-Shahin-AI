import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export async function getRecoveryMetrics(tenantId: string): Promise<{
  readinessScore: number; rtoAchievementPct: number; rpoAchievementPct: number;
  exercisePassRate: number; planCount: number; testedPlanCount: number;
}> {
  const schema = tenantSchema(tenantId);
  const [planRes, exerciseRes, rtoRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE last_exercise_at IS NOT NULL) AS tested FROM "${schema}".bcp_plans WHERE deleted_at IS NULL AND status IN ('active','approved')`, []),
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE overall_result = 'pass') AS passed FROM "${schema}".bcp_exercises WHERE deleted_at IS NULL AND status = 'completed'`, []),
    safeQuery(
      `SELECT
         AVG(CASE WHEN e.actual_rto_hours IS NOT NULL AND p.rto_hours > 0 THEN LEAST(100, (p.rto_hours / NULLIF(e.actual_rto_hours, 0)) * 100) END) AS rto_pct,
         AVG(CASE WHEN e.actual_rpo_hours IS NOT NULL AND p.rpo_hours > 0 THEN LEAST(100, (p.rpo_hours / NULLIF(e.actual_rpo_hours, 0)) * 100) END) AS rpo_pct
       FROM "${schema}".bcp_exercises e
       LEFT JOIN "${schema}".bcp_plans p ON p.plan_id = e.bcp_plan_id
       WHERE e.deleted_at IS NULL AND e.status = 'completed'`, []
    ),
  ]);

  const totalPlans = Number(planRes.rows[0]?.total || 0);
  const testedPlans = Number(planRes.rows[0]?.tested || 0);
  const totalExercises = Number(exerciseRes.rows[0]?.total || 0);
  const passedExercises = Number(exerciseRes.rows[0]?.passed || 0);
  const exercisePassRate = totalExercises > 0 ? Math.round((passedExercises / totalExercises) * 100) : 0;
  const rtoAchievement = rtoRes.rows[0]?.rto_pct ? Math.round(Number(rtoRes.rows[0].rto_pct)) : 0;
  const rpoAchievement = rtoRes.rows[0]?.rpo_pct ? Math.round(Number(rtoRes.rows[0].rpo_pct)) : 0;

  const planCoverage = totalPlans > 0 ? (testedPlans / totalPlans) * 100 : 0;
  const readinessScore = Math.round((planCoverage * 0.3 + exercisePassRate * 0.3 + rtoAchievement * 0.2 + rpoAchievement * 0.2));

  return {
    readinessScore, rtoAchievementPct: rtoAchievement, rpoAchievementPct: rpoAchievement,
    exercisePassRate, planCount: totalPlans, testedPlanCount: testedPlans,
  };
}

export async function getRtoRpoTrend(tenantId: string, months: number = 12): Promise<{
  month: string; avgRtoGap: number; avgRpoGap: number;
}[]> {
  const schema = tenantSchema(tenantId);
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT
       TO_CHAR(e.completed_at, 'YYYY-MM') AS month,
       AVG(GREATEST(0, COALESCE(e.actual_rto_hours, 0) - COALESCE(p.rto_hours, 0))) AS avg_rto_gap,
       AVG(GREATEST(0, COALESCE(e.actual_rpo_hours, 0) - COALESCE(p.rpo_hours, 0))) AS avg_rpo_gap
     FROM "${schema}".bcp_exercises e
     LEFT JOIN "${schema}".bcp_plans p ON p.plan_id = e.bcp_plan_id
     WHERE e.deleted_at IS NULL AND e.completed_at >= NOW() - INTERVAL '${months} months'
     GROUP BY TO_CHAR(e.completed_at, 'YYYY-MM')
     ORDER BY month`,
    []
  ), { operation: 'rto-rpo-trend' });

  return r.rows.map((row: GenericRow) => ({
    month: row.month as string,
    avgRtoGap: Math.round(Number(row.avg_rto_gap || 0) * 10) / 10,
    avgRpoGap: Math.round(Number(row.avg_rpo_gap || 0) * 10) / 10,
  }));
}

export async function getExerciseEffectiveness(tenantId: string): Promise<{
  exerciseType: string; total: number; passed: number; passRate: number;
}[]> {
  const schema = tenantSchema(tenantId);
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT exercise_type,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE overall_result = 'pass') AS passed
     FROM "${schema}".bcp_exercises
     WHERE deleted_at IS NULL AND status = 'completed'
     GROUP BY exercise_type
     ORDER BY exercise_type`,
    []
  ), { operation: 'exercise-effectiveness' });

  return r.rows.map((row: GenericRow) => {
    const total = Number(row.total);
    const passed = Number(row.passed);
    return {
      exerciseType: row.exercise_type as string,
      total, passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
    };
  });
}

export async function getServiceResilienceScores(tenantId: string): Promise<{
  serviceId: string; serviceName: string; criticality: string;
  hasBia: boolean; hasRecoveryStrategy: boolean; exerciseCount: number;
  resilienceScore: number;
}[]> {
  const schema = tenantSchema(tenantId);
  const services = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT s.*,
       (s.bia_id IS NOT NULL) AS has_bia,
       (SELECT COUNT(*) FROM "${schema}".bcm_recovery_strategies rs WHERE rs.bia_id = s.bia_id AND rs.deleted_at IS NULL) AS strategy_count,
       0 AS exercise_count
     FROM "${schema}".business_services s
     WHERE s.deleted_at IS NULL AND s.status = 'active'
     ORDER BY CASE s.criticality WHEN 'vital' THEN 0 WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
    []
  ), { operation: 'service-resilience' });

  return services.rows.map((s: GenericRow) => {
    const hasBia = Boolean(s.has_bia);
    const hasStrategy = Number(s.strategy_count) > 0;
    const exCount = Number(s.exercise_count);
    const score = (hasBia ? 30 : 0) + (hasStrategy ? 30 : 0) + Math.min(40, exCount * 10);
    return {
      serviceId: s.service_id as string,
      serviceName: s.service_name as string,
      criticality: s.criticality as string,
      hasBia, hasRecoveryStrategy: hasStrategy, exerciseCount: exCount,
      resilienceScore: score,
    };
  });
}

export async function getRecoveryBenchmarks(tenantId: string): Promise<{
  planId: string; planName: string; targetRto: number | null; actualRto: number | null;
  targetRpo: number | null; actualRpo: number | null; rtoMet: boolean; rpoMet: boolean;
}[]> {
  const schema = tenantSchema(tenantId);
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT p.plan_id, p.plan_name, p.rto_hours AS target_rto, p.rpo_hours AS target_rpo,
       (SELECT e.actual_rto_hours FROM "${schema}".bcp_exercises e WHERE e.bcp_plan_id = p.plan_id AND e.status = 'completed' ORDER BY e.completed_at DESC LIMIT 1) AS actual_rto,
       (SELECT e.actual_rpo_hours FROM "${schema}".bcp_exercises e WHERE e.bcp_plan_id = p.plan_id AND e.status = 'completed' ORDER BY e.completed_at DESC LIMIT 1) AS actual_rpo
     FROM "${schema}".bcp_plans p
     WHERE p.deleted_at IS NULL AND p.status IN ('active','approved')
     ORDER BY p.plan_name`,
    []
  ), { operation: 'recovery-benchmarks' });

  return r.rows.map((row: GenericRow) => {
    const targetRto = row.target_rto ? Number(row.target_rto) : null;
    const actualRto = row.actual_rto ? Number(row.actual_rto) : null;
    const targetRpo = row.target_rpo ? Number(row.target_rpo) : null;
    const actualRpo = row.actual_rpo ? Number(row.actual_rpo) : null;
    return {
      planId: row.plan_id as string,
      planName: (row.plan_name || row.title || '') as string,
      targetRto, actualRto, targetRpo, actualRpo,
      rtoMet: actualRto !== null && targetRto !== null ? actualRto <= targetRto : false,
      rpoMet: actualRpo !== null && targetRpo !== null ? actualRpo <= targetRpo : false,
    };
  });
}
