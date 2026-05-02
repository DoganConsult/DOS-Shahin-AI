import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

// ============================================
// Shahin-Ai — Audit Evidence Versions Routes
// Version history for audit evidence items
// ============================================


import { authenticate, requirePermission } from '../../../ports/auth.port';

import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  listVersions,
  getVersionById,
  getLatestVersion,
} from '../../../services/audit/execution/audit-evidence-versions.service';

import { auditMiddleware, asyncHandler, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── List all versions for an evidence item ─────────────────────────

router.get("/evidence/:evidenceId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await listVersions(req.tenantId!, req.params.evidenceId);
  res.json({ items, count: items.length });
}));

// ── Get a specific version ─────────────────────────────────────────

router.get("/:id", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getVersionById(req.tenantId!, req.params.id);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
}));

// ── Get latest version for an evidence item ────────────────────────

router.get("/evidence/:evidenceId/latest", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getLatestVersion(req.tenantId!, req.params.evidenceId);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
}));

export default router;
