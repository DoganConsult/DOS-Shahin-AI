import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// Policy Overview Routes
// API endpoints for policy dashboard KPIs,
// work queue, and recent activity feed.
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, injectScopeContext } from '../ports/middleware.port';
import {
  getOverviewKPIs,
  getWorkQueue,
  getRecentActivity,
} from '../services/policy/policy-dashboard.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware('policy'));
router.use(injectScopeContext);

/**
 * GET /
 * Overview KPIs for the policy dashboard.
 * Returns aggregated counts: total, published, draft, approved, retired,
 * overdue reviews, pending approvals, acknowledgment rate, exceptions.
 */
router.get('/', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const kpis = await getOverviewKPIs(tenantId);
  res.json({ kpis });
}));

/**
 * GET /work-queue
 * Returns the current user's policy work queue: drafts, pending reviews,
 * pending approvals, pending publications, ack follow-ups, and exceptions.
 */
router.get('/work-queue', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }
  const workQueue = await getWorkQueue(tenantId, userId);
  res.json({ workQueue });
}));

/**
 * GET /recent-activity
 * Returns the most recent policy activity entries.
 * Query: ?limit=20 (default 20, max 100)
 */
router.get('/recent-activity', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 20, 1), 100);
  const activity = await getRecentActivity(tenantId, limit);
  res.json({ activity, count: activity.length });
}));

export default router;
