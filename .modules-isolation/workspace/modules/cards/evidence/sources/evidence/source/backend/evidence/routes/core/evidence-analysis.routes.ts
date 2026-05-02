import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Evidence Multi-Modal Analysis Routes (Feature 47)
// Analyze evidence files (PDF, screenshot, CSV) via AI
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { analyzeEvidenceFile, batchAnalyzeEvidenceFiles, getEvidenceAnalysis } from '../../services/analysis/evidence-multimodal-analysis.service';
import { auditMiddleware, setAuditData, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { analyzeEvidenceBody, batchAnalyzeBody } from "../../schemas/evidence.schemas";

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

// POST /api/evidence/:evidenceId/analyze — Analyze evidence file (PDF, screenshot, CSV)
router.post("/:evidenceId/analyze", authenticate, requirePermission("evidence.item.write"), validate({ body: analyzeEvidenceBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const evidenceId = req.params.evidenceId;
  const fileId = req.body.fileId as string | undefined;

  const result = await analyzeEvidenceFile(tenantId, evidenceId, fileId);
  setAuditData(res as any, { action: "analyze", entityType: "evidence", entityId: evidenceId });
  swallow(EC.EVENT_BUS, emitEvent({
  tenantId,
  userId: req.user!.userId!,
  module: 'evidence',
  event: 'analyzed',
  entityType: 'evidence',
  entityId: evidenceId,
  }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence.analyzed' });
  res.json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/evidence/batch-analyze — Batch analyze multiple evidence files
router.post("/batch-analyze", authenticate, requirePermission("evidence.item.write"), validate({ body: batchAnalyzeBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const evidenceIds = req.body.evidenceIds as string[];

  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
  res.status(400).json({ error: "evidenceIds must be a non-empty array" });
  return;
  }

  if (evidenceIds.length > 50) {
  res.status(400).json({ error: "Maximum 50 evidence items can be analyzed in a single batch" });
  return;
  }

  const results = await batchAnalyzeEvidenceFiles(tenantId, evidenceIds);
  setAuditData(res as any, { action: "batch_analyze", entityType: "evidence", entityId: "batch" });
  swallow(EC.EVENT_BUS, emitEvent({
  tenantId,
  userId: req.user!.userId!,
  module: 'evidence',
  event: 'batch_analyzed',
  entityType: 'evidence',
  entityId: 'batch',
  }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence.batch_analyzed' });
  res.json({ results, count: results.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/evidence/:evidenceId/analysis — Get analysis results for an evidence item
router.get("/:evidenceId/analysis", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const evidenceId = req.params.evidenceId;

  const result = await getEvidenceAnalysis(tenantId, evidenceId);
  if (!result) {
  res.status(404).json({ error: "Analysis not found for this evidence item" });
  return;
  }
  res.json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;

