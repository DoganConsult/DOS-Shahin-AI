import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Governance-OS Routes
// Serves /api/governance-os endpoints
// (frontend expects this prefix instead of /api/governance)
//
// Re-exposes all governance.service functions at /api/governance-os
// plus governance-constitution endpoints and inline SQL for
// status / risk-posture / IAM log / audit-ledger views.
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import {
  createPolicy, updatePolicy, approvePolicy, getPolicies, getPolicyById, deletePolicy,
  createCommittee, updateCommittee, getCommittees,
  createGRCPlan, getGRCPlans, getGRCPlanById, updateGRCPlan, deleteGRCPlan,
  checkSLADeadlines,
} from '../../../services/governance/governance.service';
import { generateAssessmentAuditPackage } from '../../../../audit/services/audit/reporting/audit-package.service';
import { errMsg } from '../../../../../i18n/error-messages';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '../../../../../utils/db-utils';

/** Zod schemas for request body validation */
const createPolicyBody = z.object({}).passthrough();
const updatePolicyBody = z.object({}).passthrough();
const createCommitteeBody = z.object({}).passthrough();
const updateCommitteeBody = z.object({}).passthrough();
const createGRCPlanBody = z.object({}).passthrough();
const updateGRCPlanBody = z.object({}).passthrough();
const riskAppetiteBody = z.object({}).passthrough();
const authorityMatrixBody = z.object({}).passthrough();
const checkAuthorityBody = z.object({
  riskId: z.string().min(1),
  userId: z.string().min(1),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { createRiskComputeAllBody, createApproveBody, createAutoFireBody, createSeedBaselineBody } from '../../../schemas/governance.schemas';
import { genericGovernanceSchema } from "../../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(automationMiddleware('governance'));

// ═══════════════════════════════════════════
//  STATUS & POSTURE ENDPOINTS (frontend-specific)
// ═══════════════════════════════════════════

// GET /status — overall governance status summary
router.get('/status', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const policyStat = await safeQuery(`
  SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'approved')  AS approved,
  COUNT(*) FILTER (WHERE status = 'draft')     AS draft,
  COUNT(*) FILTER (WHERE status = 'pending')   AS pending_review
  FROM "${schema}".policies
  `);
  const planStat = await safeQuery(`
  SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active')    AS active,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed
  FROM "${schema}".grc_plans
  `);
  const slaStat = await safeQuery(`
  SELECT
  COUNT(*) FILTER (WHERE deadline < NOW() AND status != 'completed') AS overdue
  FROM "${schema}".grc_plans
  `);
  const p = getFirstRow(policyStat) || {};
  const g = getFirstRow(planStat) || {};
  const s = getFirstRow(slaStat) || {};
  res.json({
  policies: { total: +p.total, approved: +p.approved, draft: +p.draft, pending_review: +p.pending_review },
  plans: { total: +g.total, active: +g.active, completed: +g.completed },
  sla: { overdue: +s.overdue },
  });
}));

// GET /risk-posture — risk posture overview
router.get('/risk-posture', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
  SELECT
  risk_level,
  COUNT(*) AS count
  FROM "${schema}".risks
  GROUP BY risk_level
  ORDER BY
  CASE risk_level
  WHEN 'critical' THEN 1
  WHEN 'high' THEN 2
  WHEN 'medium' THEN 3
  WHEN 'low' THEN 4
  ELSE 5
  END
  `);
  res.json({ risk_posture: result.rows });
}));

// GET /iam/log — recent IAM/access-control log entries
router.get('/iam/log', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 50, 500);
  const result = await safeQuery(`
  SELECT *
  FROM "${schema}".audit_logs
  WHERE category = 'iam' OR action ILIKE '%access%' OR action ILIKE '%permission%'
  ORDER BY created_at DESC
  LIMIT $1
  `, [limit]);
  res.json(result.rows);
}));

// GET /audit-ledger — full governance audit ledger
router.get('/audit-ledger', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const result = await safeQuery(`
  SELECT *
  FROM "${schema}".audit_logs
  WHERE category = 'governance'
  ORDER BY created_at DESC
  LIMIT $1
  `, [limit]);
  res.json(result.rows);
}));

// POST /risk-compute-all — trigger risk recomputation
router.post('/risk-compute-all', authenticate, requirePermission('governance.record.write'), validate({ body: createRiskComputeAllBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  // Update risk scores using simple formula
  await safeQuery(`
  UPDATE "${schema}".risks
  SET risk_score = COALESCE(impact, 3) * COALESCE(likelihood, 3),
  updated_at = NOW()
  WHERE risk_score IS NULL OR risk_score = 0
  `);
  const result = await safeQuery(`SELECT COUNT(*) AS updated FROM "${schema}".risks WHERE updated_at > NOW() - INTERVAL '5 seconds'`);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.json({ success: true, risks_recomputed: parseInt(getFirstRow(result)?.updated || '0', 10) });
}));

// ═══════════════════════════════════════════
//  POLICIES (delegated to governance.service)
// ═══════════════════════════════════════════

router.get('/policies', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const user = req.user!;
  const policies = await getPolicies(req.tenantId, user ? { userId: user.userId, role: user.role } : undefined);
  res.json({ policies, count: policies.length });
}));

router.get('/policies/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const policy = await getPolicyById(req.tenantId, req.params.id);
  res.json(policy);
  } catch (err: unknown) {
  const status = toErrorMessage(err) === 'Policy not found' ? 404 : 500;
  res.status(status).json({ error: status === 404 ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

router.post('/policies', authenticate, requirePermission('governance.record.write'), validate({ body: createPolicyBody }), asyncHandler(async (req, res) => {
  const policy = await createPolicy(req.tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'policy', entityId: policy.policy_id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.status(201).json(policy);
}));

router.put('/policies/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updatePolicyBody }), asyncHandler(async (req, res) => {
  const policy = await updatePolicy(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'policy', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.updated' });
  res.json(policy);
}));

router.post('/policies/:id/approve', authenticate, requirePermission('governance.record.write'), validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
  const policy = await approvePolicy(req.tenantId, req.params.id, req.user!.userId!);
  setAuditData(res as any, { action: 'update', entityType: 'policy', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.json(policy);
}));

router.delete('/policies/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  await deletePolicy(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'policy', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.deleted' });
  res.json({ success: true });
}));

// ═══════════════════════════════════════════
//  COMMITTEES
// ═══════════════════════════════════════════

router.get('/committees', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const committees = await getCommittees(req.tenantId);
  res.json({ committees, count: committees.length });
}));

router.post('/committees', authenticate, requirePermission('governance.record.write'), validate({ body: createCommitteeBody }), asyncHandler(async (req, res) => {
  const committee = await createCommittee(req.tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'committee', entityId: committee.committee_id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.status(201).json(committee);
}));

router.put('/committees/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateCommitteeBody }), asyncHandler(async (req, res) => {
  const committee = await updateCommittee(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'committee', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.updated' });
  res.json(committee);
}));

// ═══════════════════════════════════════════
//  GRC PLANS
// ═══════════════════════════════════════════

router.get('/plans', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const plans = await getGRCPlans(req.tenantId);
  res.json({ plans, count: plans.length });
}));

router.get('/plans/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const plan = await getGRCPlanById(req.tenantId, req.params.id);
  res.json(plan);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: status === 404 ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

router.post('/plans', authenticate, requirePermission('governance.record.write'), validate({ body: createGRCPlanBody }), asyncHandler(async (req, res) => {
  const plan = await createGRCPlan(req.tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'grc_plan', entityId: plan.plan_id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.status(201).json(plan);
}));

router.put('/plans/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateGRCPlanBody }), asyncHandler(async (req, res) => {
  const plan = await updateGRCPlan(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'grc_plan', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.updated' });
  res.json(plan);
}));

router.delete('/plans/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  await deleteGRCPlan(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'grc_plan', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.deleted' });
  res.json({ success: true });
}));

// ═══════════════════════════════════════════
//  SLA & AUDIT PACKAGE
// ═══════════════════════════════════════════

router.get('/sla/check', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await checkSLADeadlines(req.tenantId);
  res.json(result);
}));

router.get('/audit-package', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  let assessmentId = req.query.assessmentId as string | undefined;
  if (!assessmentId) {
  const r = await safeQuery(
  `SELECT assessment_id FROM "${tenantSchema(tenantId)}".assessments ORDER BY created_at DESC LIMIT 1`
  );
  assessmentId = getFirstRow(r)?.assessment_id;
  }
  if (!assessmentId) {
  return res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
  }
  const pkg = await generateAssessmentAuditPackage(tenantId, assessmentId, req.user?.role);
  res.json(pkg);
}));

// ═══════════════════════════════════════════
//  GOVERNANCE CONSTITUTION (delegated dynamic imports)
// ═══════════════════════════════════════════

// Risk Appetite
router.get('/risk-appetite', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getRiskAppetite } = await import('../../../services/governance/governance-constitution.service.js');
  const data = await getRiskAppetite(req.tenantId);
  res.json(data);
}));

router.post('/risk-appetite', authenticate, requirePermission('governance.record.write'), validate({ body: riskAppetiteBody }), asyncHandler(async (req, res) => {
  const { upsertRiskAppetite } = await import('../../../services/governance/governance-constitution.service.js');
  const entries = Array.isArray(req.body) ? req.body : (req.body.entries ?? [req.body]);
  const data = await upsertRiskAppetite(req.tenantId, entries);
  setAuditData(res as any, { action: 'update', entityType: 'governance_constitution', entityId: 'risk-appetite' });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.json(data);
}));

// Authority Matrix
router.get('/authority-matrix', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getAuthorityMatrix } = await import('../../../services/governance/governance-constitution.service.js');
  const data = await getAuthorityMatrix(req.tenantId);
  res.json(data);
}));

router.post('/authority-matrix', authenticate, requirePermission('governance.record.write'), validate({ body: authorityMatrixBody }), asyncHandler(async (req, res) => {
  const { upsertAuthorityMatrix } = await import('../../../services/governance/governance-constitution.service.js');
  const rules = Array.isArray(req.body) ? req.body : (req.body.rules ?? [req.body]);
  const data = await upsertAuthorityMatrix(req.tenantId, rules);
  setAuditData(res as any, { action: 'update', entityType: 'governance_constitution', entityId: 'authority-matrix' });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.json(data);
}));

router.delete('/authority-matrix/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const { deleteAuthorityMatrixRule } = await import('../../../services/governance/governance-constitution.service.js');
  await deleteAuthorityMatrixRule(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'governance_constitution', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.deleted' });
  res.json({ success: true });
}));

// Board Attention — cross-module critical items aggregation
router.get('/board-attention', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getBoardAttentionItems } = await import('../../../services/governance/governance-hooks.service.js');
  const data = await getBoardAttentionItems(req.tenantId);
  res.json(data);
}));

// Governance Qiyas Dimensions — feed health scores into maturity model
router.get('/qiyas-dimensions', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getGovernanceQiyasDimensions } = await import('../../../services/governance/governance-hooks.service.js');
  const data = await getGovernanceQiyasDimensions(req.tenantId);
  res.json({ dimensions: data, count: data.length });
}));

// Risk Acceptance Authority Check
router.post('/check-authority', authenticate, requirePermission('governance.record.read'), validate({ body: checkAuthorityBody }), asyncHandler(async (req, res) => {
  const { checkRiskAcceptanceAuthority } = await import('../../../services/governance/governance-hooks.service.js');
  const { riskId, userId } = req.body;
  if (!riskId || !userId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await checkRiskAcceptanceAuthority(req.tenantId, riskId, userId);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_os', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_os.created' });
  res.json(result);
}));

// Escalation Thresholds
router.get('/escalation-thresholds', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getEscalationThresholds } = await import('../../../services/governance/governance-constitution.service.js');
  const data = await getEscalationThresholds(req.tenantId);
  res.json(data);
}));

// ═══════════════════════════════════════════
//  GOVERNANCE AUTO-FIRE ENDPOINTS
// ═══════════════════════════════════════════

// POST /auto-fire — manual trigger for governance scan cycle
router.post('/auto-fire', authenticate, requirePermission('governance.record.write'), validate({ body: createAutoFireBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { runGovernanceAutoFire } = await import('../../../services/governance/governance-gap-scanner.service.js');
  const result = await runGovernanceAutoFire(tenantId, userId);
  setAuditData(res as any, { action: 'create', entityType: 'governance_auto_fire', entityId: result.fireId });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'created', entityType: 'governance_auto_fire', entityId: result.fireId } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_auto_fire.created' });
  res.json(result);
}));

// POST /seed-baseline — manual trigger for governance baseline seed (admin)
router.post('/seed-baseline', authenticate, requirePermission('governance.record.write'), validate({ body: createSeedBaselineBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { seedGovernanceBaseline } = await import('../../../services/governance/governance-baseline-seeders.service.js');
  const result = await seedGovernanceBaseline(tenantId, userId);
  setAuditData(res as any, { action: 'create', entityType: 'governance_baseline', entityId: result.fireId });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'created', entityType: 'governance_baseline', entityId: result.fireId } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_baseline.created' });
  res.json(result);
}));

// GET /auto-fire/history — query past fire log
router.get('/auto-fire/history', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
  `SELECT * FROM "${schema}".governance_auto_fire_log ORDER BY started_at DESC LIMIT 50`
  );
  res.json({ history: result.rows });
}));

// GET /cross-module-summary — aggregated cross-module governance linkage status
router.get('/cross-module-summary', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const [
  frameworks, controls, risks, policies, procedures, mandates,
  objectives, committees, raci, processTasks, evidence, delegations
  ] = await Promise.all([
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".frameworks WHERE deleted_at IS NULL`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".controls WHERE deleted_at IS NULL`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".risks WHERE deleted_at IS NULL`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".policies WHERE deleted_at IS NULL`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".sop_procedures WHERE status = 'active'`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".governance_mandates WHERE deleted_at IS NULL`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".governance_objectives WHERE deleted_at IS NULL`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".committees WHERE deleted_at IS NULL`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".team_raci_assignments`),
  safeQuery(`SELECT COUNT(*) AS cnt, COUNT(*) FILTER (WHERE status = 'completed') AS completed FROM "${schema}".process_tasks`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".evidence_tasks`),
  safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".governance_delegations WHERE deleted_at IS NULL`),
  ]);

  const ptRow = getFirstRow(processTasks) || {};
  res.json({
  modules: {
  frameworks: Number(getFirstRow(frameworks)?.cnt || 0),
  controls: Number(getFirstRow(controls)?.cnt || 0),
  risks: Number(getFirstRow(risks)?.cnt || 0),
  policies: Number(getFirstRow(policies)?.cnt || 0),
  procedures: Number(getFirstRow(procedures)?.cnt || 0),
  mandates: Number(getFirstRow(mandates)?.cnt || 0),
  objectives: Number(getFirstRow(objectives)?.cnt || 0),
  committees: Number(getFirstRow(committees)?.cnt || 0),
  raciAssignments: Number(getFirstRow(raci)?.cnt || 0),
  processTasks: { total: Number(ptRow.cnt || 0), completed: Number(ptRow.completed || 0) },
  evidenceTasks: Number(getFirstRow(evidence)?.cnt || 0),
  delegations: Number(getFirstRow(delegations)?.cnt || 0),
  },
  });
}));

export default router;

