import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

// ============================================
// Shahin-Ai — Audit Finding Trends Routes
// Analytics: trends, aging, severity, recurring
// ============================================


import { authenticate, requirePermission } from '../../../ports/auth.port';

import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  getTrends,
  getAgingAnalysis,
  getSeverityDistribution,
  getTopRecurring,
} from '../../../services/audit/findings/audit-finding-trends.service';

import { auditMiddleware, asyncHandler, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── Finding trends over time ───────────────────────────────────────

router.get("/trends", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const items = await getTrends(req.tenantId!, startDate ?? '', endDate ?? '');
  res.json({ items, count: items.length });
}));

// ── Finding aging analysis ─────────────────────────────────────────

router.get("/aging", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getAgingAnalysis(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Severity breakdown ─────────────────────────────────────────────

router.get("/severity", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getSeverityDistribution(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Recurring findings ─────────────────────────────────────────────

router.get("/recurring", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const items = await getTopRecurring(req.tenantId!, limit);
  res.json({ items, count: items.length });
}));

export default router;
