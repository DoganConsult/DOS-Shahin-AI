import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import {
  validateRule, serializeRules, deserializeRules,
  savePolicyRules, getPolicyRules, executePolicyRules,
} from '../services/policy/policy-code.service';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { createValidateBody, createImportBody, createExportBody, updatePoliciesidRulesBody, createPoliciesidExecuteBody } from "../schemas/policy.schemas";

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware("policy"));
router.use(automationMiddleware("policy"));

// Validate a rule
router.post("/validate", authenticate, requirePermission("policy.document.read"), validate({ body: createValidateBody }), async (req: Request, res: Response) => {
  const result = validateRule(req.body);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_code', entityId: '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(result);
});

// Import rules from JSON
router.post("/import", authenticate, requirePermission("policy.document.write"), validate({ body: createImportBody }), async (req: Request, res: Response) => {
  const { json } = req.body;
  if (!json) { res.status(400).json({ error: "json string required" }); return; }
  const result = deserializeRules(json);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_code', entityId: '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(result);
});

// Export rules as JSON
router.post("/export", authenticate, requirePermission("policy.document.read"), validate({ body: createExportBody }), async (req: Request, res: Response) => {
  const { rules } = req.body;
  if (!rules || !Array.isArray(rules)) { res.status(400).json({ error: "rules array required" }); return; }
  const json = serializeRules(rules);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_code', entityId: '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ json });
});

// Save rules to a policy
router.put("/policies/:id/rules", authenticate, requirePermission("policy.document.write"), validate({ body: updatePoliciesidRulesBody }), async (req: Request, res: Response) => {
  try {
  const id = req.params.id as string;
  const { rules } = req.body;
  if (!rules || !Array.isArray(rules)) { res.status(400).json({ error: "rules array required" }); return; }
  const policy = await savePolicyRules(req.tenantId, id, rules);
  setAuditData(res as any, { action: "update", entityType: "policy_rules", entityId: id, afterState: policy });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'updated', entityType: 'policy_code', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(policy);
  } catch (err: unknown) {
  const code = toErrorMessage(err).includes("not found") ? 404 : toErrorMessage(err).includes("Invalid") ? 400 : 500;
  res.status(code).json({ error: toErrorMessage(err) });
  }
});

// Get rules for a policy
router.get("/policies/:id/rules", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("policy.document.read"), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const rules = await getPolicyRules(req.tenantId, id);
  res.json({ rules, count: rules.length });
});

// Execute rules against context
router.post("/policies/:id/execute", authenticate, requirePermission("policy.document.read"), validate({ body: createPoliciesidExecuteBody }), async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { context } = req.body;
  if (!context) { res.status(400).json({ error: "context object required" }); return; }
  const result = await executePolicyRules(req.tenantId, id, context);
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'policy', event: 'created', entityType: 'policy_code', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(result);
});

export default router;

