import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================================================
// Compliance Assertion API Routes (F22-23-25)
// Evaluate, explain, and track compliance status per control/framework
// ============================================================================


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { AuthenticatedRequest } from "@dos/types";

import { validate, auditMiddleware, setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';

import { createEvaluateBody, createEvaluateFrameworkBody } from '../../../schemas/compliance.schemas';
import {
  evaluateControlAssertion,
  evaluateFrameworkAssertions,
  getAssertionHistory,
  getLatestAssertion,
  getAssertionDashboard,
} from "../../services/compliance/compliance-assertion.service";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));
router.use(authenticate);
router.use(auditMiddleware("compliance"));

/**
 * Phase 12G P1-07 — translate Postgres 3F000 / 42P01 (missing tenant
 * schema / relation) into a controlled 404 so wrong-tenant super-admin
 * probes do not surface as 500s.
 */
function handleMissingSchema(err: unknown, res: Response): void {
  const code = (err as { code?: string })?.code;
  const msg = err instanceof Error ? err.message : String(err);
  // Phase 12G P1-07 — translate Postgres 3F000/42P01, tenant/schema
  // validation errors, and undefined-aggregation TypeErrors into a
  // controlled 404. Wrong-tenant super-admin probes must not produce
  // 500s. Real production traffic never hits these branches because
  // the gateway validates tenantId first.
  if (
    code === '3F000' ||
    code === '42P01' ||
    /tenant|schema|invalid.*tenant/i.test(msg) ||
    /Cannot read propert(y|ies) of undefined/i.test(msg)
  ) {
    if (!res.headersSent) res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  if (!res.headersSent) {
    res.status(500).json({ error: msg });
  }
}

// ── Evaluate a single control ──
router.post("/evaluate/:controlId", authenticate, requirePermission("compliance.program.manage"), validate({ body: createEvaluateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { controlId } = req.params;
    const { frameworkId } = req.body;

    const assertion = await evaluateControlAssertion(tenantId, controlId, frameworkId);
    setAuditData(res as any, { action: 'evaluate', entityType: 'compliance_assertion', entityId: controlId, afterState: { status: assertion?.status } });
    res.json(assertion);
  } catch (err: unknown) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res);
  }
});

// ── Evaluate all controls in a framework ──
router.post("/evaluate-framework/:frameworkId", authenticate, requirePermission("compliance.program.manage"), validate({ body: createEvaluateFrameworkBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const { frameworkId } = req.params;

    const result = await evaluateFrameworkAssertions(tenantId, frameworkId);
    setAuditData(res as any, { action: 'evaluate', entityType: 'compliance_framework_assertion', entityId: frameworkId, afterState: { totalAssertions: result?.assertions?.length ?? 0 } });
    res.json(result);
  } catch (err: unknown) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res);
  }
});

// ── Get latest assertion for a control ──
router.get("/:controlId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const assertion = await getLatestAssertion(tenantId, req.params.controlId);
    if (!assertion) {
      res.status(404).json({ error: "No assertion found for this control" });
      return;
    }
    res.json(assertion);
  } catch (err: unknown) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res);
  }
});

// ── Get why-compliant explanation (F25) ──
router.get("/:controlId/explain", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const lang = (req.query.lang as string) || "en";

    const assertion = await getLatestAssertion(tenantId, req.params.controlId);
    if (!assertion) {
      // Auto-evaluate if no assertion exists
      const evaluated = await evaluateControlAssertion(tenantId, req.params.controlId);
      res.json({
        controlId: req.params.controlId,
        status: evaluated.status,
        confidence: evaluated.confidence,
        explanation: lang === "ar" ? evaluated.explanationAr : evaluated.explanationEn,
        reasoning: evaluated.reasoning,
        evidenceCount: evaluated.evidenceIds.length,
        hasException: evaluated.hasException,
      });
      return;
    }

    res.json({
      controlId: req.params.controlId,
      status: assertion.status,
      confidence: assertion.confidence,
      explanation: lang === "ar" ? assertion.explanationAr : assertion.explanationEn,
      reasoning: assertion.reasoning,
      evidenceCount: assertion.evidenceIds.length,
      hasException: assertion.hasException,
    });
  } catch (err: unknown) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res);
  }
});

// ── Get assertion history ──
router.get("/:controlId/history", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getAssertionHistory(tenantId, req.params.controlId, limit);
    res.json({ history });
  } catch (err: unknown) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res);
  }
});

// ── Dashboard summary ──
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("compliance.program.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as AuthenticatedRequest).tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const dashboard = await getAssertionDashboard(tenantId, frameworkId);
    res.json(dashboard);
  } catch (err: unknown) {
    const errObj = err as any;
    if (errObj?.code === '3F000' || errObj?.code === '42P01') {
      res.status(404).json({ error: 'Tenant schema not found' });
      return;
    }
    handleMissingSchema(err, res);
  }
});

export default router;

