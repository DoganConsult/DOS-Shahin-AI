import { emptyResult, safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, swallowDefault, EC , catchHandler as _catchHandler } from '@dos/platform-core/resilience';

export async function createBIA(tenantId: string, data: {
  title: string; assessment_type?: string; department_id?: string; business_unit_id?: string;
  assessor_id?: string; scope?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".bia_assessments (title, assessment_type, department_id, business_unit_id, assessor_id, scope)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.title, data.assessment_type || 'standard', data.department_id || null,
     data.business_unit_id || null, data.assessor_id || null, data.scope || null]
  );
  return getFirstRow(r);
}

export async function getBIAs(tenantId: string, status?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".bia_assessments WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (status) { params.push(status); sql += ` AND status = $1`; }
  sql += ` ORDER BY created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function getBIAById(tenantId: string, biaId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const bia = (getFirstRow(await safeQuery(`SELECT * FROM "${schema}".bia_assessments WHERE bia_id = $1 AND deleted_at IS NULL`, [biaId])) as GenericRow | null);
  if (bia) {
    bia.process_impacts = (await safeQuery(
      `SELECT * FROM "${schema}".bia_process_impacts WHERE bia_id = $1 ORDER BY display_order`, [biaId]
    )).rows;
  }
  return bia ?? undefined;
}

export async function calculateBIACriticality(tenantId: string, biaId: string): Promise<{ biaId: string; criticality_rating: string; rto_hours: number | null; processCount: number }> {
  const schema = tenantSchema(tenantId);
  const impacts = (await safeQuery(`SELECT * FROM "${schema}".bia_process_impacts WHERE bia_id = $1`, [biaId])).rows;
  const critMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4, vital: 5 };
  const maxCrit = impacts.reduce((m: number, p: GenericRow) => Math.max(m, critMap[p.criticality as string] || 0), 0);
  const minRto = impacts.reduce((m: number, p: GenericRow) => p.rto_hours ? Math.min(m, Number(p.rto_hours)) : m, Infinity);
  const rating = maxCrit >= 4 ? 'critical' : maxCrit >= 3 ? 'high' : maxCrit >= 2 ? 'medium' : 'low';
  await safeQuery(
    `UPDATE "${schema}".bia_assessments SET criticality_rating = $1, rto_hours = $2, updated_at = NOW() WHERE bia_id = $3`,
    [rating, minRto === Infinity ? null : minRto, biaId]
  );
  if (rating === 'critical' || (rating as string) === 'vital') {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'bcp.bia_criticality_high', tenantId, sourceService: 'bcm-advanced',
          entityType: 'bia', entityId: biaId, severity: 'critical',
          payload: { rating, minRtoHours: minRto === Infinity ? null : minRto },
        } as any)), { tenantId, operation: 'eventBus:bcp.bia_criticality_high' });
  }
  return { biaId, criticality_rating: rating, rto_hours: minRto === Infinity ? null : minRto, processCount: impacts.length };
}

export async function createBCPExercise(tenantId: string, data: {
  title: string; bcp_plan_id?: string; exercise_type?: string; scenario?: string;
  facilitator_id?: string; scheduled_date?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".bcp_exercises (title, bcp_plan_id, exercise_type, scenario, facilitator_id, scheduled_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.title, data.bcp_plan_id || null, data.exercise_type || 'tabletop',
     data.scenario || null, data.facilitator_id || null, data.scheduled_date || null]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.exercise_scheduled', tenantId, sourceService: 'bcm-advanced',
      entityType: 'bcp_exercise', entityId: getFirstRow(r)?.exercise_id, severity: 'info',
      payload: { title: data.title, type: data.exercise_type },
    } as any)), { tenantId, operation: 'eventBus:bcp.exercise_scheduled' });
  return getFirstRow(r);
}

export async function getBCPExercises(tenantId: string, status?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".bcp_exercises WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (status) { params.push(status); sql += ` AND status = $1`; }
  sql += ` ORDER BY scheduled_date DESC NULLS LAST`;
  return (await safeQuery(sql, params)).rows;
}

export async function recordExerciseResult(tenantId: string, exerciseId: string, data: {
  result_type: string; description: string; severity?: string; assigned_to?: string; due_date?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const row = getFirstRow((await safeQuery(
    `INSERT INTO "${schema}".bcp_exercise_results (exercise_id, result_type, description, severity, assigned_to, due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [exerciseId, data.result_type, data.description, data.severity || 'medium', data.assigned_to || null, data.due_date || null]
  )));
  // Auto-create BCM finding for gaps and action items
  if (row && ['gap', 'action_item'].includes(data.result_type)) {
    const { createFinding } = await import('./bcm-findings.service.js');
    await swallow(EC.EVENT_BUS, createFinding(tenantId, {
      title: `[Exercise] ${data.description?.slice(0, 200) || 'Finding from exercise'}`,
      description: data.description,
      source_type: 'exercise',
      source_id: exerciseId,
      finding_type: data.result_type === 'gap' ? 'gap' : 'recommendation',
      severity: data.severity || 'medium',
      assigned_to: data.assigned_to,
      due_date: data.due_date,
    }), { tenantId, operation: 'auto-create-finding-from-exercise' });
  }
  return row;
}

export async function getExerciseGaps(tenantId: string, exerciseId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".bcp_exercise_results WHERE exercise_id = $1 AND result_type IN ('gap','action_item') ORDER BY severity DESC`, [exerciseId]
  )).rows;
}

export async function createCrisisCommPlan(tenantId: string, data: {
  title: string; crisis_type?: string; spokesperson_primary?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow((await safeQuery(
    `INSERT INTO "${schema}".crisis_comm_plans (title, crisis_type, spokesperson_primary) VALUES ($1,$2,$3) RETURNING *`,
    [data.title, data.crisis_type || null, data.spokesperson_primary || null]
  )));
}

export async function getCrisisCommPlans(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(`SELECT * FROM "${schema}".crisis_comm_plans WHERE deleted_at IS NULL ORDER BY created_at DESC`)).rows;
}

export async function getNotificationTree(tenantId: string, planId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".crisis_notification_tree WHERE plan_id = $1 AND is_active = TRUE ORDER BY escalation_order`, [planId]
  )).rows;
}

export async function activateCrisisComm(tenantId: string, planId: string, activatedBy: string, incidentId?: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const activation = await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(`UPDATE "${schema}".crisis_comm_plans SET status = 'activated', updated_at = NOW() WHERE plan_id = $1`, [planId], client);
    const r = await safeQueryWithClient(
      `INSERT INTO "${schema}".crisis_comm_activations (plan_id, incident_id, activated_by) VALUES ($1,$2,$3) RETURNING *`,
      [planId, incidentId || null, activatedBy], client
    );
    return getFirstRow(r);
  });

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.crisis_comm_activated', tenantId, sourceService: 'bcm-advanced',
      entityType: 'crisis_comm', entityId: activation?.activation_id, severity: 'critical',
      payload: { planId, incidentId },
    } as any)), { tenantId, operation: 'eventBus:bcp.crisis_comm_activated' });
  return activation;
}

export async function createRecoveryStrategy(tenantId: string, data: {
  title: string; strategy_type?: string; bia_id?: string; bcp_plan_id?: string;
  target_rto_hours?: number; owner_id?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow((await safeQuery(
    `INSERT INTO "${schema}".bcm_recovery_strategies (title, strategy_type, bia_id, bcp_plan_id, target_rto_hours, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.title, data.strategy_type || 'process', data.bia_id || null,
     data.bcp_plan_id || null, data.target_rto_hours || null, data.owner_id || null]
  )));
}

export async function getRecoveryStrategies(tenantId: string, biaId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".bcm_recovery_strategies WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (biaId) { params.push(biaId); sql += ` AND bia_id = $1`; }
  sql += ` ORDER BY created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function linkStrategyToBIA(tenantId: string, strategyId: string, biaId: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow((await safeQuery(
    `UPDATE "${schema}".bcm_recovery_strategies SET bia_id = $1, updated_at = NOW() WHERE strategy_id = $2 RETURNING *`,
    [biaId, strategyId]
  )));
}

export async function activateBCPlan(tenantId: string, planId: string, activatedBy: string, reason?: string, incidentId?: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".bcp_activations (bcp_plan_id, activated_by, activation_reason, incident_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [planId, activatedBy, reason || null, incidentId || null]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.plan_activated', tenantId, sourceService: 'bcm-advanced',
      entityType: 'bcp_activation', entityId: getFirstRow(r)?.activation_id, severity: 'critical',
      payload: { planId, activatedBy, reason },
    } as any)), { tenantId, operation: 'eventBus:bcp.plan_activated' });
  return getFirstRow(r);
}

export async function getBCPActivations(tenantId: string, status?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".bcp_activations WHERE 1=1`;
  const params: unknown[] = [];
  if (status) { params.push(status); sql += ` AND status = $1`; }
  sql += ` ORDER BY activated_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function updateRecoveryStep(tenantId: string, stepId: string, data: {
  status: string; notes?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const completedAt = data.status === 'completed' ? 'NOW()' : 'NULL';
  const startedAt = data.status === 'in_progress' ? 'NOW()' : 'started_at';
  const r = await safeQuery(
    `UPDATE "${schema}".bcp_recovery_step_tracking
     SET status = $1, notes = COALESCE($2, notes), started_at = ${startedAt}, completed_at = ${completedAt}, updated_at = NOW()
     WHERE step_id = $3 RETURNING *`,
    [data.status, data.notes || null, stepId]
  );
  const evType = data.status === 'completed' ? 'bcp.recovery_step_completed' : data.status === 'failed' ? 'bcp.recovery_step_failed' : null;
  if (evType && getFirstRow(r)) {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: evType, tenantId, sourceService: 'bcm-advanced',
          entityType: 'recovery_step', entityId: stepId, severity: data.status === 'failed' ? 'critical' : 'info',
          payload: { status: data.status, activationId: getFirstRow(r)?.activation_id },
        } as any)), { tenantId, operation: 'eventBus:any' });
  }
  return getFirstRow(r);
}

export async function deactivateBCPlan(tenantId: string, activationId: string, deactivatedBy: string): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".bcp_activations SET status = 'deactivated', deactivated_at = NOW(), deactivated_by = $1, updated_at = NOW()
     WHERE activation_id = $2 RETURNING *`,
    [deactivatedBy, activationId]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.plan_deactivated', tenantId, sourceService: 'bcm-advanced',
      entityType: 'bcp_activation', entityId: activationId, severity: 'info',
      payload: { deactivatedBy },
    } as any)), { tenantId, operation: 'eventBus:bcp.plan_deactivated' });
  return getFirstRow(r);
}

export async function createDependencyMap(tenantId: string, data: {
  title: string; map_type?: string; owner_id?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  return getFirstRow((await safeQuery(
    `INSERT INTO "${schema}".bcm_dependency_maps (title, map_type, owner_id) VALUES ($1,$2,$3) RETURNING *`,
    [data.title, data.map_type || 'process', data.owner_id || null]
  )));
}

export async function getDependencyChain(tenantId: string, mapId: string): Promise<{ mapId: string; nodes: GenericRow[]; edges: GenericRow[] }> {
  const schema = tenantSchema(tenantId);
  const nodes = (await safeQuery(`SELECT * FROM "${schema}".bcm_dependency_nodes WHERE map_id = $1`, [mapId])).rows;
  const edges = (await safeQuery(`SELECT * FROM "${schema}".bcm_dependency_edges WHERE map_id = $1`, [mapId])).rows;
  return { mapId, nodes, edges };
}

export async function runBCMMaturityAssessment(tenantId: string, data: {
  title: string; framework?: string; assessor_id?: string; domain_scores?: Array<{ score?: number; [key: string]: unknown }>;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const scores = data.domain_scores || [];
  const overall = scores.length > 0
    ? scores.reduce((s: number, d: { score?: number; [key: string]: unknown }) => s + (d.score || 0), 0) / scores.length : 0;
  const r = await safeQuery(
    `INSERT INTO "${schema}".bcm_maturity_assessments (title, framework, assessor_id, domain_scores, overall_score, status)
     VALUES ($1,$2,$3,$4,$5,'completed') RETURNING *`,
    [data.title, data.framework || 'ISO22301', data.assessor_id || null, JSON.stringify(scores), overall]
  );
  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.maturity_assessed', tenantId, sourceService: 'bcm-advanced',
      entityType: 'bcm_maturity', entityId: getFirstRow(r)?.assessment_id, severity: 'info',
      payload: { framework: data.framework, overallScore: overall },
    } as any)), { tenantId, operation: 'eventBus:bcp.maturity_assessed' });
  return getFirstRow(r);
}

export async function getBCMMaturityHistory(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".bcm_maturity_assessments WHERE deleted_at IS NULL ORDER BY assessment_date DESC LIMIT 20`
  )).rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADING CAPABILITIES — Drive the organization forward, not just detect issues
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-Schedule Next Exercise
 * When an exercise completes, automatically proposes the next one based on:
 * - Exercise type cadence (tabletop=6mo, functional=9mo, full-scale=12mo)
 * - Exercise result (failed → halve the interval for faster re-test)
 * - Plan maturity level (higher maturity → can extend intervals)
 */
export async function autoScheduleNextExercise(tenantId: string, completedExerciseId: string): Promise<{
  nextExerciseId: string | null; scheduledDate: string; exerciseType: string; reason: string;
}> {
  const schema = tenantSchema(tenantId);

  const exercise = getFirstRow((await safeQuery(
    `SELECT e.*, p.maturity_level, p.title AS plan_title
     FROM "${schema}".bcp_exercises e
     JOIN "${schema}".bcp_plans p ON p.plan_id = e.bcp_plan_id
     WHERE e.exercise_id = $1 AND e.deleted_at IS NULL`, [completedExerciseId]
  )));

  if (!exercise) return { nextExerciseId: null, scheduledDate: '', exerciseType: '', reason: 'Exercise not found' };

  // Check if result passed
  const result = getFirstRow((await safeQuery(
    `SELECT passed, score, max_score FROM "${schema}".bcp_exercise_results
     WHERE exercise_id = $1 ORDER BY created_at DESC LIMIT 1`, [completedExerciseId]
  )));

  const passed = result?.passed ?? true;
  const scoreRatio = result?.max_score > 0 ? result.score / result.max_score : 1;

  // Cadence rules by exercise type
  const TYPE_CADENCE_MONTHS: Record<string, number> = {
    tabletop: 6, walkthrough: 6, functional: 9, simulation: 9, full_scale: 12, parallel: 12,
  };
  let baseMonths = TYPE_CADENCE_MONTHS[exercise.exercise_type] || 6;

  // Adjust: failed → halve interval; low score → reduce by 1/3
  let reason = `Standard ${baseMonths}-month cadence for ${exercise.exercise_type}`;
  if (!passed) {
    baseMonths = Math.max(2, Math.floor(baseMonths / 2));
    reason = `Accelerated: exercise failed — re-test in ${baseMonths} months`;
  } else if (scoreRatio < 0.7) {
    baseMonths = Math.max(3, Math.floor(baseMonths * 0.67));
    reason = `Shortened: score ${Math.round(scoreRatio * 100)}% below 70% threshold`;
  } else if (exercise.maturity_level >= 4 && passed && scoreRatio >= 0.9) {
    baseMonths = Math.min(18, baseMonths + 3);
    reason = `Extended: high maturity (${exercise.maturity_level}) + strong score (${Math.round(scoreRatio * 100)}%)`;
  }

  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + baseMonths);
  const scheduledDate = nextDate.toISOString().split('T')[0];

  // Recommend exercise type escalation for mature plans
  let nextType = exercise.exercise_type;
  if (passed && scoreRatio >= 0.85) {
    const ESCALATION: Record<string, string> = {
      tabletop: 'functional', walkthrough: 'functional', functional: 'simulation', simulation: 'full_scale',
    };
    if (ESCALATION[exercise.exercise_type]) {
      nextType = ESCALATION[exercise.exercise_type];
      reason += ` — escalated to ${nextType} (passed with ${Math.round(scoreRatio * 100)}%)`;
    }
  }

  const next = await withTransaction(tenantId, async (client) => {
    const r = await safeQueryWithClient(
      `INSERT INTO "${schema}".bcp_exercises (title, bcp_plan_id, exercise_type, scheduled_date, status, scenario)
       VALUES ($1, $2, $3, $4, 'planned', $5) RETURNING exercise_id`,
      [
        `[Auto] ${nextType} exercise — ${exercise.plan_title}`,
        exercise.bcp_plan_id, nextType, scheduledDate,
        `Auto-scheduled after ${exercise.exercise_type} exercise ${completedExerciseId}. ${reason}`,
      ], client
    );

    await safeQueryWithClient(
      `UPDATE "${schema}".bcp_plans SET next_exercise_date = $1 WHERE plan_id = $2`,
      [scheduledDate, exercise.bcp_plan_id], client
    );

    return r;
  });

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'bcp.exercise_scheduled', tenantId, sourceService: 'bcm-leading',
      entityType: 'bcp_exercise', entityId: getFirstRow(next)?.exercise_id,
      severity: 'info',
      payload: { planId: exercise.bcp_plan_id, scheduledDate, exerciseType: nextType, reason, autoScheduled: true },
    } as any)), { tenantId, operation: 'eventBus:bcp.exercise_scheduled' });

  return {
    nextExerciseId: getFirstRow(next)?.exercise_id || null,
    scheduledDate, exerciseType: nextType, reason,
  };
}

/**
 * Single Point of Failure Detection (SPOF)
 * Graph traversal on dependency maps to find:
 * - Nodes with in-degree = 1 (only one upstream dependency)
 * - Critical nodes with no redundancy
 * - Chains where removing one node breaks the path
 */
export async function detectSinglePointsOfFailure(tenantId: string): Promise<Array<{
  mapId: string; mapTitle: string; nodeId: string; nodeName: string;
  criticality: string; nodeType: string; upstreamCount: number;
  downstreamCriticalCount: number; risk: 'critical' | 'high' | 'medium';
  recommendation: string;
}>> {
  const schema = tenantSchema(tenantId);

  // Find nodes that are the ONLY upstream for critical downstream nodes
  const spofs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    WITH node_deps AS (
      SELECT
        n.node_id, n.node_name, n.criticality, n.node_type, n.map_id,
        m.title AS map_title,
        (SELECT COUNT(*) FROM "${schema}".bcm_dependency_edges e WHERE e.target_node_id = n.node_id AND e.map_id = n.map_id) AS in_degree,
        (SELECT COUNT(*) FROM "${schema}".bcm_dependency_edges e
         JOIN "${schema}".bcm_dependency_nodes dn ON dn.node_id = e.target_node_id
         WHERE e.source_node_id = n.node_id AND e.map_id = n.map_id
           AND dn.criticality IN ('high','critical')) AS downstream_critical_count
      FROM "${schema}".bcm_dependency_nodes n
      JOIN "${schema}".bcm_dependency_maps m ON m.map_id = n.map_id
      WHERE m.deleted_at IS NULL
    )
    SELECT * FROM node_deps
    WHERE (in_degree <= 1 AND criticality IN ('high','critical'))
       OR (downstream_critical_count >= 2 AND in_degree <= 1)
    ORDER BY downstream_critical_count DESC, criticality DESC
    LIMIT 50
  `), { tenantId: tenantId, operation: 'query bcm_dependency_nodes' });

  return spofs.rows.map((n: GenericRow) => {
    const isCritical = n.criticality === 'critical' || n.downstream_critical_count >= 3;
    const isHigh = n.criticality === 'high' || n.downstream_critical_count >= 2;

    const recommendations: Record<string, string> = {
      technology: `Add redundant ${n.node_name} instance or failover configuration`,
      supplier: `Identify backup supplier for ${n.node_name} — single-vendor dependency`,
      facility: `Establish alternate site for ${n.node_name} operations`,
      people: `Cross-train team members to eliminate key-person dependency on ${n.node_name}`,
      process: `Document manual fallback procedure for ${n.node_name}`,
      data: `Implement data replication for ${n.node_name}`,
      service: `Configure service-level failover for ${n.node_name}`,
    };

    return {
      mapId: n.map_id, mapTitle: n.map_title,
      nodeId: n.node_id, nodeName: n.node_name,
      criticality: n.criticality, nodeType: n.node_type,
      upstreamCount: Number(n.in_degree),
      downstreamCriticalCount: Number(n.downstream_critical_count),
      risk: isCritical ? 'critical' as const : isHigh ? 'high' as const : 'medium' as const,
      recommendation: recommendations[n.node_type] || `Add redundancy for ${n.node_name}`,
    };
  });
}

/**
 * Incident Learning Analysis
 * When an incident is resolved, analyze its BCP implications:
 * - Which dependency nodes were affected?
 * - Was the BCP plan activated? How fast?
 * - Did RTO/RPO hold? What was the actual downtime?
 * - What gaps does this reveal for future exercises?
 */
export async function analyzeIncidentForBCPLearning(tenantId: string, incidentId: string): Promise<{
  incidentTitle: string; duration: string; bcpActivated: boolean;
  gapsIdentified: Array<{ gap: string; severity: string; recommendation: string }>;
  exercisesRecommended: Array<{ type: string; focus: string; urgency: string }>;
}> {
  const schema = tenantSchema(tenantId);

  const incident = getFirstRow((await safeQuery(
    `SELECT title, severity, status, created_at, resolved_at, root_cause,
            EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/3600 AS duration_hours
     FROM "${schema}".incidents WHERE incident_id = $1`, [incidentId]
  )));

  if (!incident) return { incidentTitle: '', duration: '0h', bcpActivated: false, gapsIdentified: [], exercisesRecommended: [] };

  // Check if any BCP was activated during this incident
  const activation = getFirstRow((await safeQuery(
    `SELECT activation_id, activated_at, deactivated_at, bcp_plan_id
     FROM "${schema}".bcp_activations
     WHERE incident_id = $1 AND deleted_at IS NULL`, [incidentId]
  )));

  const bcpActivated = !!activation;
  const gapsIdentified: Array<{ gap: string; severity: string; recommendation: string }> = [];
  const exercisesRecommended: Array<{ type: string; focus: string; urgency: string }> = [];

  // Gap 1: Incident occurred but no BCP activated
  if (!bcpActivated && incident.severity === 'critical') {
    gapsIdentified.push({
      gap: 'Critical incident occurred without BCP activation',
      severity: 'critical',
      recommendation: 'Review BCP activation triggers — ensure critical incidents auto-trigger BCP assessment',
    });
    exercisesRecommended.push({ type: 'tabletop', focus: 'BCP activation decision process', urgency: 'high' });
  }

  // Gap 2: Long duration suggests recovery procedures inadequate
  const hours = Number(incident.duration_hours || 0);
  if (hours > 24) {
    gapsIdentified.push({
      gap: `Incident lasted ${Math.round(hours)} hours — exceeds typical RTO targets`,
      severity: hours > 72 ? 'critical' : 'high',
      recommendation: 'Review recovery procedures and RTO targets for this incident category',
    });
    exercisesRecommended.push({ type: 'functional', focus: 'Recovery time improvement', urgency: hours > 72 ? 'critical' : 'high' });
  }

  // Gap 3: Check if similar incidents have recurred
  const similar = getFirstRow((await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".incidents
     WHERE severity = $1 AND status = 'resolved'
       AND created_at > NOW() - INTERVAL '12 months'
       AND incident_id != $2`,
    [incident.severity, incidentId]
  )));

  if (Number(similar?.cnt) >= 3) {
    gapsIdentified.push({
      gap: `${similar.cnt} similar ${incident.severity}-severity incidents in the past 12 months — pattern detected`,
      severity: 'high',
      recommendation: 'Conduct root cause analysis across recurring incidents and update BCP scenarios',
    });
    exercisesRecommended.push({ type: 'simulation', focus: `Recurring ${incident.severity} incident scenario`, urgency: 'high' });
  }

  // Gap 4: Check if any untested plans exist for the affected domain
  const untestedPlans = getFirstRow((await safeQuery(
    `SELECT COUNT(*)::int AS cnt FROM "${schema}".bcp_plans
     WHERE status IN ('approved','active') AND deleted_at IS NULL AND last_exercise_at IS NULL`
  )));

  if (Number(untestedPlans?.cnt) > 0) {
    gapsIdentified.push({
      gap: `${untestedPlans.cnt} BCP plan(s) have never been exercised — any readiness`,
      severity: 'high',
      recommendation: 'Schedule tabletop exercises for all untested plans within 30 days',
    });
  }

  return {
    incidentTitle: incident.title,
    duration: `${Math.round(hours)}h`,
    bcpActivated,
    gapsIdentified,
    exercisesRecommended,
  };
}

/**
 * Business Change Impact Assessment
 * Evaluates how organizational changes impact BCP readiness:
 * - New vendor → check dependency maps, flag if critical
 * - New system → check if covered by existing BCP plans
 * - Org restructure → check RACI assignments
 */
export async function assessBusinessChangeImpact(tenantId: string, changeType: string, changeData: {
  entityType: string; entityId: string; entityName: string; details?: string;
}): Promise<{
  impactLevel: 'critical' | 'high' | 'medium' | 'low' | 'none';
  affectedPlans: number; affectedStrategies: number;
  recommendations: string[];
}> {
  const schema = tenantSchema(tenantId);
  const recommendations: string[] = [];
  let affectedPlans = 0;
  let affectedStrategies = 0;

  if (changeType === 'vendor_onboarded' || changeType === 'vendor_changed') {
    // Check if vendor appears in dependency maps
    const depNodes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT n.node_id, n.criticality, m.title AS map_title
       FROM "${schema}".bcm_dependency_nodes n
       JOIN "${schema}".bcm_dependency_maps m ON m.map_id = n.map_id
       WHERE m.deleted_at IS NULL
         AND (LOWER(n.node_name) LIKE LOWER($1) OR n.metadata->>'vendor_id' = $2)`,
      [`%${changeData.entityName}%`, changeData.entityId]
    ), { tenantId: tenantId, operation: 'query bcm_dependency_nodes' });

    if (depNodes.rows.length > 0) {
      affectedPlans = depNodes.rows.length;
      const critical = depNodes.rows.filter((n: GenericRow) => n.criticality === 'critical');
      if (critical.length > 0) {
        recommendations.push(`Vendor "${changeData.entityName}" is in ${critical.length} CRITICAL dependency node(s) — review recovery strategies immediately`);
      }
      recommendations.push(`Update ${depNodes.rows.length} dependency map node(s) with new vendor details`);
    } else {
      recommendations.push(`New vendor "${changeData.entityName}" not found in dependency maps — assess if BCP coverage is needed`);
    }

    // Check recovery strategies
    const strategies = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".bcm_recovery_strategies
       WHERE deleted_at IS NULL AND LOWER(title) LIKE LOWER($1)`,
      [`%${changeData.entityName}%`]
    ), { tenantId: tenantId, operation: 'query bcm_recovery_strategies' });
    affectedStrategies = Number(getFirstRow(strategies)?.cnt || 0);
  }

  if (changeType === 'system_deployed' || changeType === 'connector_added') {
    recommendations.push(`New system "${changeData.entityName}" deployed — verify BCP covers its failure scenario`);
    recommendations.push(`Add "${changeData.entityName}" to relevant dependency maps`);
    recommendations.push(`Define RTO/RPO targets for "${changeData.entityName}"`);
  }

  if (changeType === 'team_restructured') {
    recommendations.push(`Team structure changed — verify BCP RACI assignments are current`);
    recommendations.push(`Review crisis communication plan contact lists`);
    recommendations.push(`Confirm exercise participant lists are updated`);
  }

  const impactLevel = affectedPlans >= 3 || (affectedPlans > 0 && affectedStrategies > 0)
    ? 'critical' : affectedPlans > 0 ? 'high' : recommendations.length > 2 ? 'medium' : 'low';

  return { impactLevel, affectedPlans, affectedStrategies, recommendations };
}
