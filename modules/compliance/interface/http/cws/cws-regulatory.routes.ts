import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Compliance Workspace — Regulatory Changes & Status Transitions
 * Sub-router mounted at "/" relative to the compliance-workspace barrel.
 */
import {
  getRegulatoryChanges,
  createRegulatoryChange,
  assessRegulatoryImpact,
  getRegulatoryChangeImpact,
  updateRegulatoryChangeStatus,
} from '../../services/compliance/compliance-workspace.service';
import { invalidateComplianceCache } from '../../../ports/platform.port';
import { logComplianceAccess } from '../../../application/compliance/reporting/compliance-observability.service';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../../ports/events.port';
import { auditMiddleware, asyncHandler, setAuditData, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createRegulatoryChangeBody, assessRegulatoryImpactBody, updateRegChangeStatusBody } from "../../../schemas/compliance.schemas";
import { requirePermission, authenticate } from '../../../ports/auth.port';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('compliance'));
router.use(moduleStack('compliance'));

// ── REGULATORY CHANGES ──────────────────────────────────────────────

router.get("/regulatory-changes", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/regulatory-changes";
  try {
    const tenantId = req.tenantId!;
    const status = req.query.status as string | undefined;
    const data = await getRegulatoryChanges(tenantId, status);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.post("/regulatory-changes", authenticate, requirePermission("framework.record.write"), validate({ body: createRegulatoryChangeBody }), asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tenantId = req.tenantId!;
  const data = await createRegulatoryChange(tenantId, req.body);
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "create", entityType: "regulatory_change", entityId: data.change_id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'regulatory_change', entityId: data.change_id } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.regulatory_change.created' });
  res.status(201).json(data);
}));

router.post("/regulatory-changes/:id/assess", authenticate, requirePermission("framework.record.write"), validate({ body: assessRegulatoryImpactBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await assessRegulatoryImpact(tenantId, req.params.id as string, req.body);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "regulatory_change", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'regulatory_change', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.regulatory_change.updated' });
  res.json(data);
}));

// ── STATUS TRANSITION ───────────────────────────────────────────────

router.patch("/regulatory-changes/:id/status", authenticate, requirePermission("framework.record.write"), validate({ body: updateRegChangeStatusBody }), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tenantId = req.tenantId!;
  const data = await updateRegulatoryChangeStatus(tenantId, req.params.id as string, status);
  if (!data) { res.status(400).json({ error: "Invalid status transition" }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "regulatory_change", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'regulatory_change', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.regulatory_change.updated' });
  res.json(data);
}));

// ── IMPACT VIEW ─────────────────────────────────────────────────────

router.get("/regulatory-changes/:id/impact", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = `/regulatory-changes/${req.params.id}/impact`;
  try {
    const tenantId = req.tenantId!;
    const data = await getRegulatoryChangeImpact(tenantId, req.params.id as string);
    if (!data) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 404);
      res.status(404).json({ error: "Regulatory change not found" });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

