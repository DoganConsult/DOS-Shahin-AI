import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit Risk Scoring Routes
// Risk-based audit prioritisation
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getScoresForEntity,
  upsertScore,
  getRiskRankedList,
  getRankedListWithRiskRegister,
  computeWeightedScore,
} from '../../../services/audit/operations/audit-risk-scoring.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const upsertScoreBody = z.object({
  universeId: z.string().min(1),
  riskFactor: z.string().min(1),
  score: z.number(),
  weight: z.number().optional(),
  assessedBy: z.string().optional(),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── Get risk scores for a universe entity ──────────────────────────

router.get("/entity/:universeId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getScoresForEntity(req.tenantId!, req.params.universeId);
  res.json({ items, count: items.length });
}));

// ── Create risk score ──────────────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: upsertScoreBody }), asyncHandler(async (req, res) => {
  const data = await upsertScore(req.tenantId!, req.body.universeId, req.body.riskFactor, req.body.score, req.body.weight, req.body.assessedBy);
  setAuditData(res as any, { action: "create", entityType: "audit_risk_score", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_risk_scoring', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_risk_scoring.created' });
  res.status(201).json(data);
}));

// ── Ranked list (all entities by composite score) ──────────────────

router.get("/ranked-list", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getRiskRankedList(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Ranked list enriched with risk register data ──────────────────

router.get("/from-register", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const data = await getRankedListWithRiskRegister(req.tenantId!);
  res.json(data);
}));

// ── Weighted score for a specific entity ───────────────────────────

router.get("/weighted/:universeId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await computeWeightedScore(req.tenantId!, req.params.universeId);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
}));

export default router;

