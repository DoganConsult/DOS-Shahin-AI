import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Shahin-Ai — Scoring Policy Engine Routes
// Scoring policy CRUD and weighted score application
// ============================================


import { authenticate, requirePermission } from '../../../../ports/auth.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  getScoringPolicies,
  getScoringPolicyById,
  createScoringPolicy,
  updateScoringPolicy,
  deleteScoringPolicy,
  applyPolicy,
} from '../../../services/misc/scoring-policy.service';

import { emitEvent } from '../../../../ports/events.port';

/** Zod schemas for scoring-policy-engine route validation */
const createPolicyBody = z.object({
  name: z.string().min(1),
  weights: z.record(z.string(), z.any()),
  is_default: z.boolean().optional(),
}).passthrough();

const updatePolicyBody = z.object({}).passthrough();

import { auditMiddleware, setAuditData as _setAuditData, validate, moduleStack } from '../../../../ports/middleware.port';

import { createApplyBody, createPolicyBody, updatePolicyBody, genericComplianceSchema } from '../../../../schemas/compliance.schemas';
import { catchHandler, EC } from '@dos/platform-core/resilience';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

// GET / — List all scoring policies for the tenant
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("assessment.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const policies = await getScoringPolicies(tenantId);
  res.json({ policies, count: policies.length });
});

// GET /:policyId — Get a specific scoring policy
router.get("/:policyId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("assessment.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { policyId } = req.params;
  const policy = await getScoringPolicyById(tenantId, policyId);
  if (!policy) {
    res.status(404).json({ error: "Scoring policy not found" });
    return;
  }
  res.json(policy);
});

// POST / — Create a new scoring policy
router.post("/", authenticate, requirePermission("assessment.record.manage"), validate({ body: createPolicyBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { name, weights, is_default } = req.body;
  if (!name || !weights) {
    res.status(400).json({ error: "name and weights are required" });
    return;
  }
  const policy = await createScoringPolicy(tenantId, { name, weights, is_default });
  res.status(201).json(policy);
});

// PUT /:policyId — Update a scoring policy
router.put("/:policyId", authenticate, requirePermission("assessment.record.manage"), validate({ body: updatePolicyBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { policyId } = req.params;
  const policy = await updateScoringPolicy(tenantId, policyId, req.body);
  res.json(policy);
});

// DELETE /:policyId — Delete a scoring policy
router.delete("/:policyId", authenticate, requirePermission("assessment.record.manage"), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { policyId } = req.params;
  const deleted = await deleteScoringPolicy(tenantId, policyId);
  if (!deleted) {
    res.status(404).json({ error: "Scoring policy not found" });
    return;
  }
  res.json({ deleted: true });
});

// POST /:policyId/apply/:assessmentId — Apply a scoring policy to an assessment
router.post("/:policyId/apply/:assessmentId", authenticate, requirePermission("assessment.record.manage"), validate({ body: createApplyBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { policyId, assessmentId } = req.params;
  const score = await applyPolicy(tenantId, assessmentId, policyId);
  // Emit posture change event after scoring policy application
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'posture_changed', entityType: 'assessment', entityId: assessmentId, data: { policyId, score } } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.json({ assessmentId, policyId, score });
});

export default router;

