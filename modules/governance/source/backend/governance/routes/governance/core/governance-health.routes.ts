import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { emptyResult, safeQuery, tenantSchema, assertTenantId } from '../../../ports/database.port';
import { emitEvent } from '../../../ports/events.port';
import { getFirstRow } from '../../../../../utils/db-utils';

/** Zod schemas for request body validation */
const updateThresholdsBody = z.object({
  green_min: z.number().optional(),
  yellow_min: z.number().optional(),
  dimension_weights: z.record(z.string(), z.any()).optional(),
}).passthrough();

import { validate, auditMiddleware, setAuditData, asyncHandler, moduleStack } from '../../../ports/middleware.port';
import { swallow, swallowDefault, EC } from '../../../ports/resilience.port';
import type { GenericRow as _GenericRow } from '@dos/types';
import { createRecalculateBody } from '../../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

const DEFAULT_HEALTH = {
  overall_score: 0, overall_grade: 'red',
  policy_health: 0, accountability: 0, committee_effectiveness: 0,
  decision_execution: 0, exception_exposure: 0, action_timeliness: 0,
  mandate_validity: 0, review_discipline: 0,
};

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id=$1 ORDER BY computed_at DESC LIMIT 1`,
    [req.tenantId]
  );
  res.json(getFirstRow(result) || DEFAULT_HEALTH);
}));

router.get('/trend', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const days = Math.min(parseInt(req.query.days as string, 10) || 30, 365);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id=$1 AND computed_at >= NOW() - $2 * INTERVAL '1 day' ORDER BY computed_at DESC`,
    [req.tenantId, days]
  );
  res.json({ history: result.rows, count: result.rows.length });
}));

router.get('/history', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const days = Math.min(parseInt(req.query.days as string, 10) || 30, 365);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id=$1 AND computed_at >= NOW() - $2 * INTERVAL '1 day' ORDER BY computed_at DESC`,
    [req.tenantId, days]
  );
  res.json({ history: result.rows, count: result.rows.length });
}));

router.post('/recalculate', authenticate, requirePermission('governance.record.read'), validate({ body: createRecalculateBody }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);

  const weights = { policy_health: 1.5, accountability: 1.2, committee_effectiveness: 1.0, decision_execution: 1.0, exception_exposure: 1.3, action_timeliness: 1.0, mandate_validity: 0.8, review_discipline: 0.8 };

  const row = <T extends Record<string, unknown>>(rs: { rows: unknown[] }, fallback: T): T => (getFirstRow(rs) as T) ?? fallback;

  const policyRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='approved' OR status='published') AS approved FROM "${schema}".policies WHERE deleted_at IS NULL`);
  const pr = row(policyRs, { total: 0, approved: 0 });
  const policyHealth = +pr.total > 0 ? (+pr.approved / +pr.total) * 100 : 50;

  const actionRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='completed' OR status='closed') AS done, COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('completed','closed')) AS overdue FROM "${schema}".governance_action_items WHERE deleted_at IS NULL`);
  const ar = row(actionRs, { total: 0, done: 0, overdue: 0 });
  const actionTimeliness = +ar.total > 0 ? Math.max(0, 100 - (+ar.overdue / +ar.total) * 100) : 50;

  const committeeRs = await safeQuery(`SELECT COUNT(*) AS total FROM "${schema}".committees`);
  const cr = row(committeeRs, { total: 0 });
  const committeeEffectiveness = +cr.total > 0 ? 70 : 30;

  const decisionRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='implemented') AS implemented FROM "${schema}".governance_decisions WHERE deleted_at IS NULL`);
  const dr = row(decisionRs, { total: 0, implemented: 0 });
  const decisionExecution = +dr.total > 0 ? (+dr.implemented / +dr.total) * 100 : 50;

  const exceptionRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='open' AND (severity='high' OR severity='critical')) AS highOpen FROM "${schema}".exceptions WHERE deleted_at IS NULL`);
  const er = row(exceptionRs, { total: 0, highOpen: 0 });
  const exceptionExposure = +er.total > 0 ? Math.max(0, 100 - (+er.highOpen * 20)) : 80;

  const acctRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE owner IS NOT NULL AND owner != '') AS with_owner FROM "${schema}".policies WHERE deleted_at IS NULL`);
  const acctR = row(acctRs, { total: 0, with_owner: 0 });
  const acctCommRs = await safeQuery(`SELECT COUNT(*) AS total FROM "${schema}".committees`);
  const acctCR = row(acctCommRs, { total: 0 });
  const acctRespRs = await safeQuery(`SELECT COUNT(*) AS total FROM "${schema}".governance_responsibilities WHERE deleted_at IS NULL`);
  const acctRespAssignRs = await safeQuery(`SELECT COUNT(*) AS assigned FROM "${schema}".governance_responsibility_assignments`);
  const acctResp = row(acctRespRs, { total: 0 });
  const acctRespAssign = row(acctRespAssignRs, { assigned: 0 });
  const policyOwnerRatio = +acctR.total > 0 ? (+acctR.with_owner / +acctR.total) * 100 : 50;
  const respAssignRatio = +acctResp.total > 0 ? Math.min(100, (+acctRespAssign.assigned / +acctResp.total) * 100) : 50;
  const accountability = Math.round((policyOwnerRatio * 0.5 + respAssignRatio * 0.3 + (+acctCR.total > 0 ? 80 : 30) * 0.2) * 100) / 100;

  const mandateRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active' AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)) AS valid FROM "${schema}".governance_mandates WHERE deleted_at IS NULL`);
  const mr = row(mandateRs, { total: 0, valid: 0 });
  const charterRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='active' AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)) AS valid FROM "${schema}".governance_charters WHERE deleted_at IS NULL`);
  const chr = row(charterRs, { total: 0, valid: 0 });
  const mandateScore = +mr.total > 0 ? (+mr.valid / +mr.total) * 100 : 50;
  const charterScore = +chr.total > 0 ? (+chr.valid / +chr.total) * 100 : 50;
  const mandateValidity = Math.round((mandateScore * 0.5 + charterScore * 0.5) * 100) / 100;

  const reviewCountRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE next_review_date IS NOT NULL AND next_review_date < NOW() AND outcome NOT IN ('approved')) AS overdue FROM "${schema}".governance_policy_reviews WHERE deleted_at IS NULL`);
  const rcr = row(reviewCountRs, { total: 0, overdue: 0 });
  const ackRs = await safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL) AS acked FROM "${schema}".governance_policy_acknowledgements WHERE deleted_at IS NULL`);
  const akr = row(ackRs, { total: 0, acked: 0 });
  const reviewOverdueRatio = +rcr.total > 0 ? (+rcr.overdue / +rcr.total) * 100 : 0;
  const ackCompletionRatio = +akr.total > 0 ? (+akr.acked / +akr.total) * 100 : 50;
  const reviewDiscipline = Math.round((Math.max(0, 100 - reviewOverdueRatio) * 0.6 + ackCompletionRatio * 0.4) * 100) / 100;

  const dims: Record<string, number> = { policy_health: policyHealth, accountability, committee_effectiveness: committeeEffectiveness, decision_execution: decisionExecution, exception_exposure: exceptionExposure, action_timeliness: actionTimeliness, mandate_validity: mandateValidity, review_discipline: reviewDiscipline };

  let weightedSum = 0, totalWeight = 0;
  for (const [k, w] of Object.entries(weights)) {
    weightedSum += (dims[k] || 0) * w;
    totalWeight += w;
  }
  const overallScore = Math.round((weightedSum / totalWeight) * 100) / 100;

  const thresholdRs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".governance_health_thresholds WHERE tenant_id=$1 LIMIT 1`, [tenantId]), { tenantId: req.tenantId!, operation: 'query governance_health_thresholds' });
  const greenMin = getFirstRow(thresholdRs)?.green_min || 80;
  const yellowMin = getFirstRow(thresholdRs)?.yellow_min || 60;
  const grade = (overallScore as any) >= greenMin ? 'green' : (overallScore as any) >= yellowMin ? 'yellow' : 'red';

  await safeQuery(
    `INSERT INTO "${schema}".governance_health_scores (tenant_id, overall_score, overall_grade, policy_health, accountability, committee_effectiveness, decision_execution, exception_exposure, action_timeliness, mandate_validity, review_discipline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [tenantId, overallScore, grade, policyHealth, accountability, committeeEffectiveness, decisionExecution, exceptionExposure, actionTimeliness, mandateValidity, reviewDiscipline]
  );

  const prevRs = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT overall_score FROM "${schema}".governance_health_scores WHERE tenant_id=$1 ORDER BY computed_at DESC LIMIT 1 OFFSET 1`, [tenantId]), { tenantId: req.tenantId!, operation: 'query governance_health_scores' });
  const previousScore = getFirstRow(prevRs)?.overall_score ?? null;
  const trend = previousScore !== null ? Math.round((overallScore - +previousScore) * 100) / 100 : null;

  setAuditData(res as any, { action: 'create', entityType: 'governance_health_score', afterState: { overall_score: overallScore, overall_grade: grade } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_health_score', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_health_score.created' });
  res.json({ overall_score: overallScore, overall_grade: grade, dimensions: dims, previous_score: previousScore, trend });
}));

router.get('/thresholds', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".governance_health_thresholds WHERE tenant_id=$1 LIMIT 1`, [req.tenantId]);
  res.json(getFirstRow(result) || { green_min: 80, yellow_min: 60, dimension_weights: {} });
}));

router.put('/thresholds', authenticate, requirePermission('governance.record.write'), validate({ body: updateThresholdsBody }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const { green_min, yellow_min, dimension_weights } = req.body;
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_health_thresholds (tenant_id, green_min, yellow_min, dimension_weights) VALUES ($1,$2,$3,$4)
     ON CONFLICT (tenant_id) DO UPDATE SET green_min=COALESCE($2,governance_health_thresholds.green_min), yellow_min=COALESCE($3,governance_health_thresholds.yellow_min), dimension_weights=COALESCE($4,governance_health_thresholds.dimension_weights), updated_at=NOW() RETURNING *`,
    [req.tenantId, green_min || 80, yellow_min || 60, JSON.stringify(dimension_weights || {})]
  );
  setAuditData(res as any, { action: 'update', entityType: 'governance_health_threshold', afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_health_threshold', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_health_threshold.updated' });
  res.json(getFirstRow(result));
}));

router.get('/board-watchlist', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  assertTenantId(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const actions = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT action_id, title, status, priority, due_date, board_attention FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND (board_attention=true OR (due_date < NOW() AND status NOT IN ('completed','closed'))) ORDER BY due_date LIMIT 20`), { tenantId: req.tenantId!, operation: 'query governance_action_items' });
  const violations = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".governance_enforcement_log WHERE status='open' ORDER BY detected_at DESC LIMIT 20`), { tenantId: req.tenantId!, operation: 'query governance_action_items' });
  res.json({ actions: actions.rows, violations: violations.rows });
}));

export default router;

