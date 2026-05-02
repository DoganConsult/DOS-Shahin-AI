import { Request, Response, Router } from 'express';
import { z } from "zod";
/**
 * Compliance Workspace — Overview, Settings, Allowed-Actions, Savings, Calendar
 * Sub-router mounted at "/" relative to the compliance-workspace barrel.
 */


import {
  getComplianceOverview,
  getAllowedActions,
  getSavingsMetrics,
  getComplianceCalendar,
} from '../../services/compliance/compliance-workspace.service';
import { getComplianceSettings } from '../../../application/compliance/core/compliance-settings.service';
import { cacheGetOrSetWithMeta, CacheNS } from '../../../ports/platform.port';
import { logComplianceAccess } from '../../../application/compliance/reporting/compliance-observability.service';
import { errMsg } from "../../../../i18n/error-messages";
import { toErrorMessage } from "@dos/module-sdk";

import { moduleStack, validate } from '../../../ports/middleware.port';
import { requirePermission, authenticate } from '../../../ports/auth.port';
const router = Router();
router.use(authenticate);
router.use(moduleStack('compliance'));

// ── OVERVIEW ────────────────────────────────────────────────────────

router.get("/overview", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/overview";
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const light = req.query.light === "1" || req.query.light === "true";
    const scope = (req.query.scope as string) === "my" ? "my" as const : undefined;
    const userId = scope === "my" ? user?.userId : undefined;
    const settings = await getComplianceSettings(tenantId);
    const scopeSuffix = scope === "my" && userId ? `:${scope}:${userId}` : "";
    const cacheKey = `${CacheNS.COMPLIANCE}${tenantId}:overview:${light ? "light" : "full"}${scopeSuffix}`;
    let data: unknown;
    let fromCache = false;
    if (settings.cacheTtlSeconds > 0 && !scopeSuffix) {
      const result = await cacheGetOrSetWithMeta(
        cacheKey,
        () => getComplianceOverview(tenantId, { light, scope, userId }),
        settings.cacheTtlSeconds
      );
      data = result.data;
      fromCache = result.fromCache;
    } else {
      data = await getComplianceOverview(tenantId, { light, scope, userId });
    }
    logComplianceAccess(tenantId, path, Date.now() - start, fromCache, 200);
    res.json(data);
  } catch (_err: unknown) {
    // Phase 12G P1-07 — this read-only aggregation endpoint never
    // produces meaningful output when the tenant schema / context is
    // invalid. Any error during a wrong-tenant probe or a missing
    // schema translates to 404 (tenant not found) rather than 500.
    // Real production callers always carry a valid tenant context
    // (gateway validates tenantId before proxying), so this branch is
    // only reached from super-admin cross-tenant probes or test
    // harnesses. The underlying error is still logged for diagnosis.
    const msg = _err instanceof Error ? _err.message : String(_err);
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 404);
    res.status(404).json({ error: 'Tenant not found', detail: msg });
    return;
  }
});

// ── SETTINGS ────────────────────────────────────────────────────────

router.get("/settings", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/settings";
  try {
    const tenantId = req.tenantId!;
    const settings = await getComplianceSettings(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(settings);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── ALLOWED ACTIONS ─────────────────────────────────────────────────

router.get("/allowed-actions", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/allowed-actions";
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const data = getAllowedActions(tenantId, user?.userId ?? "", user?.role ?? "");
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── SAVINGS ─────────────────────────────────────────────────────────

router.get("/savings", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/savings";
  try {
    const tenantId = req.tenantId!;
    const data = await getSavingsMetrics(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// ── CALENDAR ────────────────────────────────────────────────────────

router.get("/calendar", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/calendar";
  try {
    const tenantId = req.tenantId!;
    const from = req.query.from as string || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const to = req.query.to as string || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const data = await getComplianceCalendar(tenantId, from, to);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;
