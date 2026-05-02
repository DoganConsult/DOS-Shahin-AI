import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  mapFramework, mapControlToNodes, testControl,
  getGapAnalysis, createRemediation, getRemediations, updateRemediationStatus,
} from '../../services/compliance/compliance.service';
import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';

import { pushToTenant, buildWSEvent, emitEvent } from '../../../ports/events.port';
import { errMsg } from "../../../../i18n/error-messages";
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';
import { createRemediationBody, updateRemediationBody, createAttestationBody as _createAttestationBody, mapControlBody, testControlBody, createObligationBody, updateObligationBody, mapControlToObligationBody, linkPolicyToObligationBody, createAutoMapBody, createAutoMapAllBody, genericComplianceSchema, controlMutationSchema } from "../../../schemas/compliance.schemas";
import { idParam } from "../../../../schemas/common.schemas";
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, fieldRbacFilter, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));
router.use(fieldRbacFilter("compliance"));

// === Compliance Overview (AGRC-OS grade dashboard data) ===

/**
 * @swagger
 * /compliance/overview:
 *   get:
 *     summary: Get compliance posture overview with framework scores and control coverage
 *     tags: [Compliance]
 *     responses:
 *       200:
 *         description: Compliance dashboard data including framework coverage, control stats, remediation progress
 */
router.get("/overview", authenticate, requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId!);

  const [fwRes, ctrlRes, polRes, remRes, evidRes, evCountRes] = await Promise.all([
  safeQuery(`SELECT framework_id, name, category, total_controls, implemented_controls, completion_percent, status
  FROM "${schema}".frameworks
  WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE)
  ORDER BY created_at`),
  safeQuery(`SELECT control_id, title, status, test_status, frameworks, mapped_registry_nodes, last_tested_at, evidence_ids
  FROM "${schema}".controls ORDER BY created_at DESC`),
  safeQuery(`SELECT policy_id, title, status, approval_status, category, review_frequency, next_review_date, effective_date, expiry_date
  FROM "${schema}".policies WHERE deleted_at IS NULL ORDER BY updated_at DESC NULLS LAST`),
  safeQuery(`SELECT control_id, title, status, owner FROM "${schema}".controls WHERE status = 'remediation_planned' ORDER BY created_at DESC`),
  safeQuery(`SELECT evidence_id, title, status, expiry_date, control_id FROM "${schema}".evidence ORDER BY created_at DESC LIMIT 50`),
  safeQuery(`SELECT control_id, COUNT(*)::int AS cnt FROM "${schema}".evidence GROUP BY control_id`),
  ]);

  const frameworks = fwRes.rows;
  const controls = ctrlRes.rows;
  const policies = polRes.rows;
  const remediations = remRes.rows;
  const evidence = evidRes.rows;

  const evCountMap = new Map<string, number>();
  for (const row of evCountRes.rows) { evCountMap.set(row.control_id, row.cnt); }
  const controlsWithEvidence = evCountMap.size;

  const totalControls = controls.length;
  const implemented = controls.filter((c: GenericRow) => c.status === 'implemented').length;
  const tested = controls.filter((c: GenericRow) => c.test_status === 'passed').length;
  const failed = controls.filter((c: GenericRow) => c.test_status === 'failed').length;
  const notTested = controls.filter((c: GenericRow) => !c.test_status || c.test_status === 'not_tested').length;

  const totalPolicies = policies.length;
  const approvedPolicies = policies.filter((p: GenericRow) => p.approval_status === 'approved').length;
  const draftPolicies = policies.filter((p: GenericRow) => p.approval_status === 'draft' || p.status === 'draft').length;
  const expiredPolicies = policies.filter((p: GenericRow) => p.expiry_date && new Date(p.expiry_date) < new Date()).length;
  const reviewDue = policies.filter((p: GenericRow) => p.next_review_date && new Date(p.next_review_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;

  const avgCompletion = frameworks.length > 0
  ? Math.round(frameworks.reduce((s: number, f: GenericRow) => s + (f.completion_percent || 0), 0) / frameworks.length)
  : 0;

  const controlsByStatus: Record<string, number> = {};
  for (const c of controls) { controlsByStatus[c.status] = (controlsByStatus[c.status] || 0) + 1; }

  const frameworkSummaries = frameworks.map((f: GenericRow) => {
  const fwControls = controls.filter((c: GenericRow) => (c.frameworks || []).includes(f.framework_id));
  const fwImpl = fwControls.filter((c: GenericRow) => c.status === 'implemented').length;
  const fwWithEvidence = fwControls.filter((c: GenericRow) => evCountMap.has(c.control_id)).length;
  const fwTotalCtrl = f.total_controls || fwControls.length;
  return {
  frameworkId: f.framework_id,
  name: f.name,
  category: f.category,
  totalControls: fwTotalCtrl,
  implementedControls: f.implemented_controls || fwImpl,
  completionPercent: f.completion_percent || (fwControls.length > 0 ? Math.round((fwImpl / fwControls.length) * 100) : 0),
  evidenceCoverage: fwTotalCtrl > 0 ? Math.round((fwWithEvidence / fwTotalCtrl) * 100) : 0,
  status: f.status,
  };
  });

  const overallScore = totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0;

  res.json({
  overallScore,
  avgFrameworkCompletion: avgCompletion,
  frameworks: { total: frameworks.length, summaries: frameworkSummaries },
  controls: {
  total: totalControls, implemented, tested, failed, notTested,
  byStatus: controlsByStatus,
  remediations: remediations.length,
  },
  policies: {
  total: totalPolicies, approved: approvedPolicies, draft: draftPolicies,
  expired: expiredPolicies, reviewDue,
  },
  evidence: {
  total: evidence.length,
  controlsWithEvidence,
  evidenceCoverage: totalControls > 0 ? Math.round((controlsWithEvidence / totalControls) * 100) : 0,
  },
  remediations: remediations.map((r: GenericRow) => ({
  controlId: r.control_id, title: r.title, status: r.status, owner: r.owner,
  })),
  });
}));

// === Framework Mapping ===

router.get("/frameworks/:id/mapping", authenticate, requirePermission("framework.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const mapping = await mapFramework(req.tenantId!, id);
  res.json(mapping);
}));

router.post("/controls/:id/map", authenticate, requirePermission("control.record.write"), validate({ body: mapControlBody }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { nodeIds } = req.body;
  if (!nodeIds || !Array.isArray(nodeIds)) {
  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return;
  }
  const control = await mapControlToNodes(req.tenantId!, id, nodeIds);
  setAuditData(res as any, { action: "update", entityType: "control", entityId: id, afterState: control });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'controls', event: 'updated', entityType: 'control', entityId: id, data: control } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.control.updated' });
  res.json(control);
}));

// === Control Testing ===

router.post("/controls/:id/test", authenticate, requirePermission("control.record.write"), validate({ body: testControlBody }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { testResult } = req.body;
  if (!testResult || !['pass', 'fail', 'partial'].includes(testResult)) {
  res.status(400).json({ error: errMsg('INVALID_INPUT', req) }); return;
  }
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await testControl(tenantId, id, {
  ...req.body, testedBy: userId,
  });
  setAuditData(res as any, { action: "update", entityType: "control_test", entityId: id, afterState: result });
  emitEvent(({ tenantId, userId, module: 'controls', event: 'tested', entityType: 'control', entityId: id, data: { testResult, ...result } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));

  if (testResult === 'fail' || testResult === 'partial') {
  const schema = tenantSchema(tenantId);
  safeQuery(
  `INSERT INTO "${schema}".grc_qiyas_control_feedback
  (control_id, test_result, feedback_type, notes, created_by, created_at)
  VALUES ($1, $2, $3, $4, $5, NOW())
  ON CONFLICT DO NOTHING`,
  [id, testResult, 'control_test_fail', req.body.notes || null, userId]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
  safeQuery(
  `INSERT INTO "${schema}".qiyas_grc_trigger_log
  (trigger_type, source_entity_id, source_entity_type, payload, status, created_at)
  VALUES ('control_test_fail', $1, 'control', $2, 'pending', NOW())`,
  [id, JSON.stringify({ testResult, controlId: id, testedBy: userId })]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
  pushToTenant(tenantId, buildWSEvent('agent_action_queued', {
  triggerType: 'control_test_fail',
  controlId: id,
  testResult,
  }));
  }

  res.json(result);
}));

// === Gap Analysis ===

/**
 * @swagger
 * /compliance/gap-analysis/{frameworkId}:
 *   get:
 *     summary: Run gap analysis for a specific framework
 *     tags: [Compliance]
 *     parameters:
 *       - in: path
 *         name: frameworkId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Gap analysis results with control coverage and remediation gaps
 */
router.get("/gap-analysis/:frameworkId", authenticate, requirePermission("framework.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const frameworkId = req.params.frameworkId as string;
  const analysis = await getGapAnalysis(req.tenantId!, frameworkId);
  res.json(analysis);
}));

// === Remediation Tracking ===

router.post("/remediations", authenticate, requirePermission("control.record.write"), validate({ body: createRemediationBody }), asyncHandler(async (req, res) => {
  const { frameworkId, nodeId, title } = req.body;
  if (!frameworkId || !nodeId || !title) {
  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return;
  }
  const remediation = await createRemediation(req.tenantId!, req.body);

  setAuditData(res as any, { action: "create", entityType: "remediation", entityId: remediation.control_id, afterState: remediation });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'compliance', event: 'remediation_created', entityType: 'remediation', entityId: remediation.control_id, data: remediation } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:compliance.remediation.remediation_created' });
  res.status(201).json(remediation);
}));

router.get("/remediations", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const frameworkId = req.query.frameworkId as string | undefined;
  const remediations = await getRemediations(req.tenantId!, frameworkId);
  res.json({ remediations, count: remediations.length });
}));

router.put("/remediations/:id/status", authenticate, requirePermission("control.record.write"), validate({ params: idParam, body: updateRemediationBody }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await updateRemediationStatus(req.tenantId!, id, status);
  setAuditData(res as any, { action: "update", entityType: "remediation", entityId: id, afterState: result });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'compliance', event: 'remediation_updated', entityType: 'remediation', entityId: id, data: { status, ...result } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(result);
}));

// === Control Dependency Graph (Priority 11) ===

router.get("/controls/:controlId/dependency-graph", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const controlId = req.params.controlId as string;
  const maxDepth = parseInt(req.query.maxDepth as string || '5', 10);
  
  const { getControlDependencyGraphForVisualization } = await import('../../services/misc/control-dependency-graph.service.js');
  const graph = await getControlDependencyGraphForVisualization(req.tenantId!, controlId, maxDepth);
  
  res.json({
  controlId,
  graph,
  nodeCount: graph.nodes.length,
  edgeCount: graph.edges.length,
  });
}));

router.get("/controls/:controlId/downstream", authenticate, requirePermission("control.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const controlId = req.params.controlId as string;
  const maxDepth = parseInt(req.query.maxDepth as string || '10', 10);
  
  const { getDownstreamControls } = await import('../../services/misc/control-dependency-graph.service.js');
  const downstreamIds = await getDownstreamControls(req.tenantId!, controlId, maxDepth);
  
  res.json({
  controlId,
  downstreamControls: downstreamIds,
  count: downstreamIds.length,
  });
}));

// === Obligation Register (Priority 12) ===

/**
 * @swagger
 * /compliance/obligations:
 *   get:
 *     summary: List regulatory obligations with status and due dates
 *     tags: [Compliance]
 *     responses:
 *       200:
 *         description: Obligation list
 */
router.get("/obligations", authenticate, requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const {
  createObligation: _createObligation,
  listObligations,
  getObligationById: _getObligationById,
  updateObligation: _updateObligation,
  deleteObligation: _deleteObligation,
  getObligationControls: _getObligationControls,
  mapControlToObligation: _mapControlToObligation,
  unmapControlFromObligation: _unmapControlFromObligation,
  autoMapObligationToControls: _autoMapObligationToControls,
  autoMapAllObligationsForFramework: _autoMapAllObligationsForFramework
  } = await import('../../../governance/services/misc/obligation.service.js');

  const filters = {
  frameworkId: req.query.frameworkId as string | undefined,
  status: req.query.status as string | undefined,
  ownerId: req.query.ownerId as string | undefined,
  search: req.query.search as string | undefined,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
  };

  const result = await listObligations(req.tenantId!, filters);
  res.json(result);
}));

router.get("/obligations/:obligationId", authenticate, requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getObligationById } = await import('../../../governance/services/misc/obligation.service.js');
  const obligation = await getObligationById(req.tenantId!, req.params.obligationId);
  res.json(obligation);
}));

router.post("/obligations", authenticate, requirePermission("compliance.program.write"), validate({ body: createObligationBody }), asyncHandler(async (req, res) => {
  const { createObligation } = await import('../../../governance/services/misc/obligation.service.js');
  const obligation = await createObligation(req.tenantId!, req.body, req.user!.userId!);
  setAuditData(res as any, { action: "create", entityType: "obligation", entityId: obligation.obligationId, afterState: obligation });
  res.status(201).json(obligation);
}));

router.put("/obligations/:obligationId", authenticate, requirePermission("compliance.program.write"), validate({ body: updateObligationBody }), asyncHandler(async (req, res) => {
  const { updateObligation } = await import('../../../governance/services/misc/obligation.service.js');
  const obligation = await updateObligation(req.tenantId!, req.params.obligationId, req.body, req.user!.userId!);
  setAuditData(res as any, { action: "update", entityType: "obligation", entityId: req.params.obligationId, afterState: obligation });
  res.json(obligation);
}));

router.delete("/obligations/:obligationId", authenticate, requirePermission("compliance.program.write"), validate({ body: genericComplianceSchema }), asyncHandler(async (req, res) => {
  const { deleteObligation } = await import('../../../governance/services/misc/obligation.service.js');
  await deleteObligation(req.tenantId!, req.params.obligationId, req.user!.userId!);
  setAuditData(res as any, { action: "delete", entityType: "obligation", entityId: req.params.obligationId });
  res.status(204).send();
}));

router.get("/obligations/:obligationId/controls", authenticate, requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getObligationControls } = await import('../../../governance/services/misc/obligation.service.js');
  const controls = await getObligationControls(req.tenantId!, req.params.obligationId);
  res.json({ controls, count: controls.length });
}));

router.post("/obligations/:obligationId/controls/:controlId", authenticate, requirePermission("compliance.program.write"), validate({ body: mapControlToObligationBody }), asyncHandler(async (req, res) => {
  const { mapControlToObligation } = await import('../../../governance/services/misc/obligation.service.js');
  const mappingType = (req.body.mappingType || 'direct') as 'direct' | 'partial' | 'compensating';
  const coveragePercent = req.body.coveragePercent ? parseFloat(req.body.coveragePercent) : 100.00;
  const mapping = await mapControlToObligation(
  req.tenantId!,
  req.params.obligationId,
  req.params.controlId,
  mappingType,
  coveragePercent,
  req.user!.userId!
  );
  setAuditData(res as any, { action: "create", entityType: "obligation_mapping", entityId: mapping.mappingId, afterState: mapping });
  res.status(201).json(mapping);
}));

router.delete("/obligations/:obligationId/controls/:controlId", authenticate, requirePermission("compliance.program.write"), validate({ body: controlMutationSchema }), asyncHandler(async (req, res) => {
  const { unmapControlFromObligation } = await import('../../../governance/services/misc/obligation.service.js');
  await unmapControlFromObligation(req.tenantId!, req.params.obligationId, req.params.controlId, req.user!.userId!);
  setAuditData(res as any, { action: "delete", entityType: "obligation_mapping", entityId: `${req.params.obligationId}:${req.params.controlId}` });
  res.status(204).send();
}));

router.post("/obligations/:obligationId/auto-map", authenticate, requirePermission("compliance.program.write"), validate({ body: createAutoMapBody }), asyncHandler(async (req, res) => {
  const { autoMapObligationToControls } = await import('../../../governance/services/misc/obligation.service.js');
  const result = await autoMapObligationToControls(req.tenantId!, req.params.obligationId, req.user!.userId!);
  res.json(result);
}));

router.post("/obligations/framework/:frameworkId/auto-map-all", authenticate, requirePermission("compliance.program.write"), validate({ body: createAutoMapAllBody }), asyncHandler(async (req, res) => {
  const { autoMapAllObligationsForFramework } = await import('../../../governance/services/misc/obligation.service.js');
  const result = await autoMapAllObligationsForFramework(req.tenantId!, req.params.frameworkId, req.user!.userId!);
  res.json(result);
}));

// === Obligation ↔ Policy Links ===

router.get("/obligations/:obligationId/policies", authenticate, requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { getObligationPolicies } = await import('../../../governance/services/misc/obligation.service.js');
  const policies = await getObligationPolicies(req.tenantId!, req.params.obligationId);
  res.json({ policies, count: policies.length });
}));

router.post("/obligations/:obligationId/policies/:policyId", authenticate, requirePermission("compliance.program.write"),
  validate({ body: linkPolicyToObligationBody }),
  asyncHandler(async (req, res) => {
    const { linkPolicyToObligation } = await import('../../../governance/services/misc/obligation.service.js');
    const linkType = (req.body.linkType || 'implements') as 'implements' | 'supports' | 'references';
    const relevanceScore = req.body.relevanceScore ?? 100.00;
    const link = await linkPolicyToObligation(
      req.tenantId!,
      req.params.obligationId,
      req.params.policyId,
      linkType,
      relevanceScore,
      req.body.notes || null,
      req.user!.userId!
    );
    setAuditData(res as any, { action: "create", entityType: "obligation_policy_link", entityId: link.linkId, afterState: link });
    res.status(201).json(link);
  })
);

router.delete("/obligations/:obligationId/policies/:policyId", authenticate, requirePermission("compliance.program.write"), validate({ body: genericComplianceSchema }), asyncHandler(async (req, res) => {
  const { unlinkPolicyFromObligation } = await import('../../../governance/services/misc/obligation.service.js');
  await unlinkPolicyFromObligation(req.tenantId!, req.params.obligationId, req.params.policyId, req.user!.userId!);
  setAuditData(res as any, { action: "delete", entityType: "obligation_policy_link", entityId: `${req.params.obligationId}:${req.params.policyId}` });
  res.status(204).send();
}));

export default router;
