import { Request, Response, Router } from 'express';
import { z } from "zod";

// ============================================
// Evidence Health Dashboard Routes
// GET /health — overall evidence health snapshot
// GET /completeness — per-control completeness breakdown
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  getEvidenceHealthSnapshot,
  getEvidenceCompletenessPerControl,
} from '../../services/core/evidence-health.service';

import { moduleStack } from '../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('evidence'));

// GET /api/evidence/health — Returns overall evidence health snapshot
router.get("/health", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const snapshot = await getEvidenceHealthSnapshot(tenantId);
    res.json(snapshot);
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/evidence/completeness — Returns per-control evidence completeness
router.get("/completeness", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const completeness = await getEvidenceCompletenessPerControl(tenantId);
    res.json({ controls: completeness, count: completeness.length });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

export default router;
