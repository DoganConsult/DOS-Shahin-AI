import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Compliance Workspace — Frameworks, Domains, Obligations
 * Sub-router mounted at "/" relative to the compliance-workspace barrel.
 */
import {
  getFrameworksRegister,
  getFrameworkDetail,
  getFrameworkComparison,
  updateFramework,
  assessFramework,
  getDomainsRegister,
  getDomainSummary,
  getDomainDetail,
  getObligationsRegister,
  getObligationDetail,
  mapControlToObligation,
  mapEvidenceToObligation,
  updateObligation,
  importObligations,
} from '../../services/compliance/compliance-workspace.service';
import { getComplianceSettings } from '../../../application/compliance/core/compliance-settings.service';
import { cacheGetOrSetWithMeta, invalidateComplianceCache, CacheNS } from '../../../ports/platform.port';
import { logComplianceAccess } from '../../../application/compliance/reporting/compliance-observability.service';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../../ports/events.port';
import { auditMiddleware, asyncHandler, setAuditData, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { updateFrameworkBody, assessFrameworkBody, mapControlToObligationBody, mapEvidenceToObligationBody, importObligationsBody, updateObligationPatchBody } from "../../../schemas/compliance.schemas";
import { requirePermission, authenticate } from '../../../ports/auth.port';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('compliance'));
router.use(moduleStack('compliance'));

// ── FRAMEWORKS ──────────────────────────────────────────────────────

router.get("/frameworks", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/frameworks";
  try {
    const tenantId = req.tenantId!;
    const regulator = (req.query.regulator as string)?.trim();
    const preset = (req.query.preset as string)?.trim();
    const options = (regulator || preset) ? { regulator: regulator || undefined, preset: preset || undefined } : undefined;
    const settings = await getComplianceSettings(tenantId);
    const cacheKey = `${CacheNS.COMPLIANCE}${tenantId}:frameworks:${preset || ""}:${regulator || ""}`;
    let data: unknown;
    let fromCache = false;
    if (settings.cacheTtlSeconds > 0) {
      const result = await cacheGetOrSetWithMeta(cacheKey, () => getFrameworksRegister(tenantId, options), settings.cacheTtlSeconds);
      data = result.data;
      fromCache = result.fromCache;
    } else {
      data = await getFrameworksRegister(tenantId, options);
    }
    logComplianceAccess(tenantId, path, Date.now() - start, fromCache, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.patch("/frameworks/:code", authenticate, requirePermission("framework.record.write"), validate({ body: updateFrameworkBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await updateFramework(tenantId, req.params.code as string, req.body);
  if (!data) { res.status(400).json({ error: errMsg('NO_FIELDS_TO_UPDATE', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "framework", entityId: req.params.code as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.updated' });
  res.json(data);
}));

router.post("/frameworks/:code/assess", authenticate, requirePermission("framework.record.read"), validate({ body: assessFrameworkBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await assessFramework(tenantId, req.params.code as string, req.user?.userId);
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "create", entityType: "assessment", entityId: data.assessmentId, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.created' });
  res.json(data);
}));

router.get("/frameworks/comparison", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/frameworks/comparison";
  try {
    const tenantId = req.tenantId!;
    const data = await getFrameworkComparison(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/frameworks/:code", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/frameworks/:code";
  try {
    const tenantId = req.tenantId!;
    const data = await getFrameworkDetail(tenantId, req.params.code as string);
    if (!data) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 404);
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── DOMAINS ─────────────────────────────────────────────────────────

router.get("/domains", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/domains";
  try {
    const tenantId = req.tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const data = await getDomainsRegister(tenantId, frameworkId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/domains/:nodeId/summary", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/domains/:nodeId/summary";
  try {
    const tenantId = req.tenantId!;
    const data = await getDomainSummary(tenantId, req.params.nodeId as string);
    if (!data) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 404);
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/domains/:nodeId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/domains/:nodeId";
  try {
    const tenantId = req.tenantId!;
    const data = await getDomainDetail(tenantId, req.params.nodeId as string);
    if (!data) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 404);
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── OBLIGATIONS ─────────────────────────────────────────────────────

router.get("/obligations", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/obligations";
  try {
    const tenantId = req.tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const data = await getObligationsRegister(tenantId, frameworkId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.get("/obligations/:nodeId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/obligations/:nodeId";
  try {
    const tenantId = req.tenantId!;
    const data = await getObligationDetail(tenantId, req.params.nodeId as string);
    if (!data) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 404);
      res.status(404).json({ error: errMsg('NOT_FOUND', req) });
      return;
    }
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.post("/obligations/:nodeId/map-control", authenticate, requirePermission("control.record.write"), validate({ body: mapControlToObligationBody }), asyncHandler(async (req, res) => {
  const { controlId } = req.body;
  if (!controlId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tenantId = req.tenantId!;
  const data = await mapControlToObligation(tenantId, req.params.nodeId as string, controlId);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "obligation_control_map", entityId: req.params.nodeId as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.created' });
  res.json(data);
}));

router.post("/obligations/:nodeId/map-evidence", authenticate, requirePermission("control.record.write"), validate({ body: mapEvidenceToObligationBody }), asyncHandler(async (req, res) => {
  const { evidenceId } = req.body;
  if (!evidenceId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tenantId = req.tenantId!;
  const data = await mapEvidenceToObligation(tenantId, req.params.nodeId as string, evidenceId);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "obligation_evidence_map", entityId: req.params.nodeId as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'created', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.created' });
  res.json(data);
}));

router.post("/obligations/import", authenticate, requirePermission("obligation.write"), validate({ body: importObligationsBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { obligations } = req.body;
  if (!Array.isArray(obligations) || obligations.length === 0) {
  res.status(400).json({ error: errMsg('INVALID_INPUT', req) }); return;
  }
  const data = await importObligations(tenantId, obligations);
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: 'create', entityType: 'obligation_import', entityId: 'bulk', afterState: { imported: data.imported } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'obligation_created', entityType: 'obligation', entityId: 'bulk' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.obligation.obligation_created' });
  res.status(201).json(data);
}));

router.patch("/obligations/:nodeId", authenticate, requirePermission("control.record.write"), validate({ body: updateObligationPatchBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await updateObligation(tenantId, req.params.nodeId as string, req.body);
  if (!data) { res.status(400).json({ error: errMsg('NO_FIELDS_TO_UPDATE', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "obligation", entityId: req.params.nodeId as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'compliance_workspace', entityId: req.params.id || '' } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.compliance_workspace.updated' });
  res.json(data);
}));

export default router;

