import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Compliance Advanced Routes
// Regulatory changes, obligations, calendar,
// test plans, cross-framework map, filings,
// continuous monitoring
// ============================================


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { AuthenticatedRequest } from "@dos/types";

import { validate, asyncHandler, auditMiddleware, setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';

import { createRegulatoryChangesBody, updateStatusBody, createImpactBody, createObligationsBody, updateObligationsBody, createTestPlansBody, createExecuteBody, createFilingsBody, createRefreshBody } from '../../../schemas/compliance.schemas';
import {
  createRegulatoryChange,
  getRegulatoryChanges,
  updateRegulatoryChangeStatus,
  assessRegulatoryImpact,
  getObligations,
  createObligation,
  updateObligation,
  getComplianceCalendar,
  createTestPlan,
  getTestPlans,
  executeTestPlan,
  getCrossFrameworkMap,
  getFilings,
  createFiling,
  updateFilingStatus,
  getComplianceMonitoringStatus,
  triggerEvidenceRefresh,
} from "../../services/compliance/compliance-advanced.service";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));
router.use(auditMiddleware("compliance"));

// ---------------------------------------------------------------------------
// 2.1 Regulatory Change Management
// ---------------------------------------------------------------------------

/** POST /regulatory-changes — Create a new regulatory change. */
router.post(
  "/regulatory-changes",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: createRegulatoryChangesBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const data = {
      ...req.body,
      identifiedBy: req.body.identifiedBy || (req as AuthenticatedRequest).userId!,
    };
    const change = await createRegulatoryChange(tenantId, data);
    setAuditData(res as any, { action: "create", entityType: "regulatory_change", entityId: change.change_id, afterState: change });
    res.status(201).json(change);
  })
);

/** GET /regulatory-changes — List regulatory changes with optional filters. */
router.get(
  "/regulatory-changes",
  authenticate,
  requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const filters = {
      status: req.query.status as string | undefined,
      impactLevel: req.query.impactLevel as string | undefined,
    };
    const changes = await getRegulatoryChanges(tenantId, filters);
    res.json({ changes, count: changes.length });
  })
);

/** PUT /regulatory-changes/:id/status — Update regulatory change status. */
router.put(
  "/regulatory-changes/:id/status",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: updateStatusBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const changeId = req.params.id;
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }
    const userId = (req as AuthenticatedRequest).userId!;
    const change = await updateRegulatoryChangeStatus(tenantId, changeId, status, userId);
    setAuditData(res as any, { action: "update", entityType: "regulatory_change", entityId: changeId, afterState: change });
    res.json(change);
  })
);

/** POST /regulatory-changes/:id/impact — Record impact assessment. */
router.post(
  "/regulatory-changes/:id/impact",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: createImpactBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const changeId = req.params.id;
    const change = await assessRegulatoryImpact(tenantId, changeId, req.body);
    setAuditData(res as any, { action: "update", entityType: "regulatory_change", entityId: changeId, afterState: change });
    res.json(change);
  })
);

// ---------------------------------------------------------------------------
// 2.2 Compliance Obligations Register
// ---------------------------------------------------------------------------

/** GET /obligations — List compliance obligations. */
router.get(
  "/obligations",
  authenticate,
  requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const filters = {
      status: req.query.status as string | undefined,
      jurisdiction: req.query.jurisdiction as string | undefined,
      frameworkId: req.query.frameworkId as string | undefined,
    };
    const obligations = await getObligations(tenantId, filters);
    res.json({ obligations, count: obligations.length });
  })
);

/** POST /obligations — Create a new compliance obligation. */
router.post(
  "/obligations",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: createObligationsBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const obligation = await createObligation(tenantId, req.body);
    setAuditData(res as any, { action: "create", entityType: "compliance_obligation", entityId: obligation.obligation_id, afterState: obligation });
    res.status(201).json(obligation);
  })
);

/** PUT /obligations/:id — Update a compliance obligation. */
router.put(
  "/obligations/:id",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: updateObligationsBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const obligationId = req.params.id;
    const obligation = await updateObligation(tenantId, obligationId, req.body);
    setAuditData(res as any, { action: "update", entityType: "compliance_obligation", entityId: obligationId, afterState: obligation });
    res.json(obligation);
  })
);

// ---------------------------------------------------------------------------
// 2.3 Compliance Calendar
// ---------------------------------------------------------------------------

/** GET /calendar — Aggregated compliance calendar events. */
router.get(
  "/calendar",
  authenticate,
  requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (!startDate || !endDate) {
      res.status(400).json({ error: "startDate and endDate query parameters are required" });
      return;
    }
    const events = await getComplianceCalendar(tenantId, startDate, endDate);
    res.json({ events, count: events.length });
  })
);

// ---------------------------------------------------------------------------
// 2.4 Control Test Plan Scheduling
// ---------------------------------------------------------------------------

/** POST /test-plans — Create a new test plan. */
router.post(
  "/test-plans",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: createTestPlansBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const data = {
      ...req.body,
      createdBy: req.body.createdBy || (req as AuthenticatedRequest).userId!,
    };
    const plan = await createTestPlan(tenantId, data);
    setAuditData(res as any, { action: "create", entityType: "control_test_plan", entityId: plan.plan_id, afterState: plan });
    res.status(201).json(plan);
  })
);

/** GET /test-plans — List all test plans. */
router.get(
  "/test-plans",
  authenticate,
  requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const plans = await getTestPlans(tenantId);
    res.json({ plans, count: plans.length });
  })
);

/** POST /test-plans/:id/execute — Execute a test plan. */
router.post(
  "/test-plans/:id/execute",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: createExecuteBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const planId = req.params.id;
    const executedBy = (req as AuthenticatedRequest).userId!;
    const result = await executeTestPlan(tenantId, planId, executedBy);
    setAuditData(res as any, { action: "update", entityType: "control_test_plan", entityId: planId, afterState: result });
    res.json(result);
  })
);

// ---------------------------------------------------------------------------
// 2.5 Cross-Framework Mapping
// ---------------------------------------------------------------------------

/** GET /cross-framework-map — Show controls mapped across multiple frameworks. */
router.get(
  "/cross-framework-map",
  authenticate,
  requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const map = await getCrossFrameworkMap(tenantId);
    res.json(map);
  })
);

// ---------------------------------------------------------------------------
// 2.6 Regulatory Filing Tracker
// ---------------------------------------------------------------------------

/** GET /filings — List regulatory filings. */
router.get(
  "/filings",
  authenticate,
  requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const filters = {
      status: req.query.status as string | undefined,
      regulator: req.query.regulator as string | undefined,
      jurisdiction: req.query.jurisdiction as string | undefined,
    };
    const filings = await getFilings(tenantId, filters);
    res.json({ filings, count: filings.length });
  })
);

/** POST /filings — Create a new regulatory filing. */
router.post(
  "/filings",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: createFilingsBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { title, regulator } = req.body;
    if (!title || !regulator) {
      res.status(400).json({ error: "title and regulator are required" });
      return;
    }
    const filing = await createFiling(tenantId, req.body);
    setAuditData(res as any, { action: "create", entityType: "regulatory_filing", entityId: filing.filing_id, afterState: filing });
    res.status(201).json(filing);
  })
);

/** PUT /filings/:id/status — Update filing status. */
router.put(
  "/filings/:id/status",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: updateStatusBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const filingId = req.params.id;
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }
    const filing = await updateFilingStatus(tenantId, filingId, status);
    setAuditData(res as any, { action: "update", entityType: "regulatory_filing", entityId: filingId, afterState: filing });
    res.json(filing);
  })
);

// ---------------------------------------------------------------------------
// 2.7 Continuous Compliance Monitoring
// ---------------------------------------------------------------------------

/** GET /monitoring-status — Get compliance monitoring overview. */
router.get(
  "/monitoring-status",
  authenticate,
  requirePermission("compliance.program.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const status = await getComplianceMonitoringStatus(tenantId);
    res.json(status);
  })
);

/** POST /monitoring/refresh — Trigger evidence freshness refresh. */
router.post(
  "/monitoring/refresh",
  authenticate,
  requirePermission("compliance.program.write"),
  validate({ body: createRefreshBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const frameworkId = req.body.frameworkId as string | undefined;
    const result = await triggerEvidenceRefresh(tenantId, frameworkId);
    res.json(result);
  })
);

export default router;

