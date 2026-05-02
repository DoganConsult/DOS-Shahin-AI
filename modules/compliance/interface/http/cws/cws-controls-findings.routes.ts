import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Compliance Workspace — Controls, Findings, Bulk Actions, Exports
 * Sub-router mounted at "/" relative to the compliance-workspace barrel.
 */
import {
  getControlsRegister,
  getControlMonitoring,
  exportControls,
  getFindingsRegister,
  exportFindings,
  createFinding,
  updateFinding,
  bulkUpdateFindingStatus,
  bulkAssignControls,
} from '../../services/compliance/compliance-workspace.service';
import { getComplianceSettings } from '../../../application/compliance/core/compliance-settings.service';
import { invalidateComplianceCache } from '../../../ports/platform.port';
import { logComplianceAccess } from '../../../application/compliance/reporting/compliance-observability.service';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../../ports/events.port';
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createFindingBody, updateFindingBody, bulkUpdateFindingStatusBody, bulkAssignControlsBody, createGenerateAiSuggestionsBody } from "../../../schemas/compliance.schemas";
import { requirePermission, authenticate } from '../../../ports/auth.port';

const router = Router();
router.use(authenticate);
router.use(moduleStack('compliance'));

// ── CONTROLS REGISTER ───────────────────────────────────────────────

router.get("/controls", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("control.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/controls";
  try {
    const tenantId = req.tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const status = req.query.status as string | undefined;
    const owner = req.query.owner as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const pageSizeParam = parseInt(String(req.query.pageSize || req.query.limit), 10);
    const settings = await getComplianceSettings(tenantId);
    const limit = Math.min(
      Math.max(1, Number.isNaN(pageSizeParam) || pageSizeParam < 1 ? settings.paginationDefaultPageSize : pageSizeParam),
      settings.paginationMaxPageSize
    );
    const offset = (page - 1) * limit;
    const scope = (req.query.scope as string) === "my" ? "my" as const : undefined;
    const userId = scope === "my" ? req.user?.userId : undefined;
    const data = await getControlsRegister(tenantId, frameworkId, { limit, offset, scope, userId, status, owner, userRole: req.user?.role });
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── CONTROLS EXPORT ─────────────────────────────────────────────────

router.get("/controls/export", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("control.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/controls/export";
  try {
    const tenantId = req.tenantId!;
    const format = (req.query.format as string) || "csv";
    if (format !== "csv" && format !== "xlsx") {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 400);
      return res.status(400).json({ error: "Format must be 'csv' or 'xlsx'" });
    }
    const frameworkId = req.query.frameworkId as string | undefined;
    const status = req.query.status as string | undefined;
    const owner = req.query.owner as string | undefined;
    const scope = (req.query.scope as string) === "my" ? "my" as const : undefined;
    const userId = scope === "my" ? req.user?.userId : undefined;
    const { buffer, filename, contentType } = await exportControls(tenantId, format as "csv" | "xlsx", frameworkId, scope, userId, status, owner);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.send(buffer);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── CONTROL MONITORING ──────────────────────────────────────────────

router.get("/control-monitoring", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/control-monitoring";
  try {
    const tenantId = req.tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const data = await getControlMonitoring(tenantId, { frameworkId });
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── FINDINGS REGISTER ───────────────────────────────────────────────

router.get("/findings", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/findings";
  try {
    const tenantId = req.tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const severity = req.query.severity as string | undefined;
    const status = req.query.status as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const page = Math.max(1, parseInt(String(req.query.page || 1), 10));
    const pageSizeParam = parseInt(String(req.query.pageSize || req.query.limit), 10);
    const settings = await getComplianceSettings(tenantId);
    const pageSize = Math.max(1, Number.isNaN(pageSizeParam) || pageSizeParam < 1 ? settings.paginationDefaultPageSize : pageSizeParam);
    const limit = Math.min(pageSize, settings.paginationMaxPageSize);
    const offset = (page - 1) * limit;
    const scope = (req.query.scope as string) === "my" ? "my" as const : undefined;
    const userId = scope === "my" ? req.user?.userId : undefined;
    const data = await getFindingsRegister(tenantId, frameworkId, severity, { limit, offset, scope, userId, status, assignedTo, userRole: req.user?.role });
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── FINDINGS EXPORT ─────────────────────────────────────────────────

router.get("/findings/export", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/findings/export";
  try {
    const tenantId = req.tenantId!;
    const format = (req.query.format as string) || "csv";
    if (format !== "csv" && format !== "xlsx") {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 400);
      return res.status(400).json({ error: "Format must be 'csv' or 'xlsx'" });
    }
    const frameworkId = req.query.frameworkId as string | undefined;
    const severity = req.query.severity as string | undefined;
    const status = req.query.status as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const scope = (req.query.scope as string) === "my" ? "my" as const : undefined;
    const userId = scope === "my" ? req.user?.userId : undefined;
    const { buffer, filename, contentType } = await exportFindings(tenantId, format as "csv" | "xlsx", frameworkId, severity, scope, userId, status, assignedTo);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.send(buffer);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── FINDINGS CREATE / UPDATE ────────────────────────────────────────

router.post("/findings", authenticate, requirePermission("control.record.write"), validate({ body: createFindingBody }), asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tenantId = req.tenantId!;
  const data = await createFinding(tenantId, req.body);
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "create", entityType: "finding", entityId: data.finding_id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'finding', entityId: data.finding_id } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.finding.created' });
  res.status(201).json(data);
}));

router.patch("/findings/:id", authenticate, requirePermission("control.record.write"), validate({ body: updateFindingBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await updateFinding(tenantId, req.params.id as string, req.body);
  if (!data) { res.status(400).json({ error: errMsg('NO_FIELDS_TO_UPDATE', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "finding", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'finding', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.finding.updated' });
  res.json(data);
}));

// P5.1: AI Finding Remediation -- Generate AI suggestions on-demand

router.post("/findings/:id/generate-ai-suggestions", authenticate, requirePermission("control.record.read"), validate({ body: createGenerateAiSuggestionsBody }), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = `/findings/${req.params.id}/generate-ai-suggestions`;
  try {
    const tenantId = req.tenantId!;
    const findingId = req.params.id as string;
    const { generateFindingRemediationSuggestions } = await import("../../services/compliance/compliance-workspace.service.js");
    const suggestions = await generateFindingRemediationSuggestions(tenantId, findingId);
    if (!suggestions) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 404);
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(suggestions);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── BULK ACTIONS ────────────────────────────────────────────────────

router.post("/findings/bulk-status", authenticate, requirePermission("control.record.write"), auditMiddleware, validate({ body: bulkUpdateFindingStatusBody }), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/findings/bulk-status";
  try {
    const { findingIds, status } = req.body;
    if (!Array.isArray(findingIds) || findingIds.length === 0) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 400);
      return;
    }
    if (!status || typeof status !== 'string') {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 400);
      return;
    }
    const tenantId = req.tenantId!;
    const result = await bulkUpdateFindingStatus(tenantId, findingIds, status);
    await invalidateComplianceCache(tenantId);
    setAuditData(res as any, { action: "bulk_update", entityType: "finding", entityId: "bulk", afterState: { findingIds, status, updated: result.updated } });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'bulk_updated', entityType: 'finding', entityId: 'bulk' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.finding.bulk_updated' });
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(result);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.post("/controls/bulk-assign", authenticate, requirePermission("control.record.write"), auditMiddleware, validate({ body: bulkAssignControlsBody }), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/controls/bulk-assign";
  try {
    const { controlIds, ownerId } = req.body;
    if (!Array.isArray(controlIds) || controlIds.length === 0) {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 400);
      return;
    }
    if (!ownerId || typeof ownerId !== 'string') {
      res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
      logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 400);
      return;
    }
    const tenantId = req.tenantId!;
    const result = await bulkAssignControls(tenantId, controlIds, ownerId);
    await invalidateComplianceCache(tenantId);
    setAuditData(res as any, { action: "bulk_assign", entityType: "control", entityId: "bulk", afterState: { controlIds, ownerId, updated: result.updated } });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'bulk_assigned', entityType: 'control', entityId: 'bulk' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.control.bulk_assigned' });
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(result);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

