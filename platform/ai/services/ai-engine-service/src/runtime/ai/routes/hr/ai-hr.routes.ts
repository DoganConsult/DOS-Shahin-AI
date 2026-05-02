/**
 * AI-HR HTTP routes — read-only employee org-chart for the workspace UI.
 *
 * Mounted as a top-level /api/ai-hr router on ai-engine. Gateway forwards
 * /api/ai-hr/* directly. Tenant scope is taken from the authenticated user.
 */

import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  listEmployees, getEmployee, listManagers,
  listManagerInbox, acknowledgeReport, actionReport,
  getAgentTimeline, getAgentKpiTrend,
  runDueShifts, seedShiftsForAllTenants,
} from '../../services/hr/ai-hr.service';

type ManagerInboxStatus = 'filed' | 'acknowledged' | 'actioned' | 'all';

const router: ExpressRouter = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, module: 'ai-hr', service: 'ai-engine-service' });
});

router.use(authenticate);

/** GET /api/ai-hr/employees — org-chart list view (one row per agent A01..A13). */
router.get('/employees', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId ?? null;
    const managerRole = typeof req.query.manager === 'string' ? req.query.manager : undefined;
    const rows = await listEmployees(tenantId, managerRole);
    res.json({ count: rows.length, employees: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'employees list failed', details: err?.message });
  }
});

/** GET /api/ai-hr/managers — manager-role rollup (used by the filter pill). */
router.get('/managers', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId ?? null;
    const rows = await listManagers(tenantId);
    res.json({ count: rows.length, managers: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'managers list failed', details: err?.message });
  }
});

/** GET /api/ai-hr/employees/:id/timeline — joined activity feed (reports + shifts + audit + KPI). */
router.get('/employees/:id/timeline', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId ?? null;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;
    const items = await getAgentTimeline(tenantId, req.params.id, limit);
    res.json({ count: items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: 'timeline failed', details: err?.message });
  }
});

/** GET /api/ai-hr/employees/:id/kpi-trend — daily KPI snapshots (last 30d default). */
router.get('/employees/:id/kpi-trend', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId ?? null;
    const days = req.query.days ? Math.min(Math.max(Number(req.query.days), 1), 365) : 30;
    const trend = await getAgentKpiTrend(tenantId, req.params.id, days);
    res.json({ agentId: req.params.id, days, trend });
  } catch (err: any) {
    res.status(500).json({ error: 'kpi-trend failed', details: err?.message });
  }
});

/** GET /api/ai-hr/employees/:id — full employee profile (incl. recent reports). */
router.get('/employees/:id', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId ?? null;
    const view = await getEmployee(tenantId, req.params.id);
    if (!view) {
      res.status(404).json({ error: 'employee not found', agentId: req.params.id });
      return;
    }
    res.json(view);
  } catch (err: any) {
    res.status(500).json({ error: 'employee fetch failed', details: err?.message });
  }
});

/**
 * GET /api/ai-hr/inbox — manager's view of pending agent reports.
 *
 * Filters by the caller's roles → only reports from agents whose
 * managerRoleCode matches the caller. platform_admin sees everything.
 * Default status='filed' (pending review).
 */
router.get('/inbox', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const tenantId = user?.tenantId ?? null;
    const roleCodes: string[] = Array.isArray(user?.roles)
      ? user.roles.map((r: any) => (typeof r === 'string' ? r : r?.code)).filter(Boolean)
      : [];
    const isSuperAdmin = user?.is_super_admin === true || user?.isSuperAdmin === true;
    const status = (req.query.status as ManagerInboxStatus) || 'filed';
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 500) : 100;
    const offset = req.query.offset ? Math.max(Number(req.query.offset), 0) : 0;
    const rows = await listManagerInbox(tenantId, roleCodes, { status, limit, offset, isSuperAdmin });
    res.json({ count: rows.length, status, limit, offset, rows });
  } catch (err: any) {
    res.status(500).json({ error: 'inbox list failed', details: err?.message });
  }
});

/** POST /api/ai-hr/inbox/:id/acknowledge — mark a filed report as reviewed. */
router.post('/inbox/:id/acknowledge', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const ok = await acknowledgeReport(req.params.id, user?.sub ?? user?.email ?? 'unknown');
    if (!ok) { res.status(404).json({ error: 'report not found or not in filed state' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'acknowledge failed', details: err?.message });
  }
});

/** POST /api/ai-hr/inbox/:id/action — mark a report as actioned (closed loop). */
router.post('/inbox/:id/action', requirePermission('ai.copilot.read'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const ok = await actionReport(req.params.id, user?.sub ?? user?.email ?? 'unknown');
    if (!ok) { res.status(404).json({ error: 'report not found or already actioned' }); return; }
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'action failed', details: err?.message });
  }
});

/** POST /api/ai-hr/_seed — admin-only re-seed of shifts (idempotent). */
router.post('/_seed', requirePermission('admin:write'), async (_req: Request, res: Response) => {
  try {
    const result = await seedShiftsForAllTenants();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'seed failed', details: err?.message });
  }
});

/** POST /api/ai-hr/_run-due — admin-only force-run of due shifts (smoke testing). */
router.post('/_run-due', requirePermission('admin:write'), async (_req: Request, res: Response) => {
  try {
    const result = await runDueShifts();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'run-due failed', details: err?.message });
  }
});

export default router;
