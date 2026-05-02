import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { logger } from '../../ports/logger.port';
// ============================================
// Evidence Core Routes — CRUD, listing, verify, collect, policy-check, stats
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { recordActivity } from '../../ports/platform.port';
import { submitEvidence, verifyHashChain } from '../../services/workflow/evidence-submission.service';
import { getEvidenceForControl, getAllEvidence, getExpiredEvidence, getOverviewStats, getEvidenceMappings } from '../../services/core/evidence-query.service';
import { submitEvidenceVersion, getExpiringEvidence } from '../../services/workflow/evidence-versioning.service';
import { enforceEvidencePolicy } from '../../services/core/evidence-policy.service';
import {
  transitionStatus,
  getStatusHistory,
  type EvidenceStatus,
} from '../../services/core/evidence-lifecycle.service';
import { getEvidenceCoverageDashboard } from '../../services/analysis/evidence-scoring.service';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent, notifyDomainChange, pushToTenant, buildWSEvent } from '../../ports/events.port';
import { errMsg } from "../../../../i18n/error-messages";
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

import { submitEvidenceBody, submitVersionBody, collectEvidenceBody, policyCheckBody, transitionStatusBody, updateCatalogBody, createArchiveBody, createRestoreBody } from "../../schemas/evidence.schemas";
import { idParam } from "../../../../schemas/common.schemas";
import { auditMiddleware, requireOwnership, setAuditData, lifecycleGate, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';

const router = Router();
router.use(auditMiddleware('evidence'));
router.use(moduleStack('evidence'));

/** @swagger
 * /evidence:
 *   get:
 *     summary: List all evidence items with hash-chain verification
 *     tags: [Evidence]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, submitted, reviewed, approved, expired] }
 *     responses:
 *       200:
 *         description: Evidence list
 */
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const user = req.user!;
  const filters: Record<string, string | undefined> = {
  department_id: req.query.department_id as string | undefined,
  business_unit_id: req.query.business_unit_id as string | undefined,
  location_id: req.query.location_id as string | undefined,
  owner_role_id: req.query.owner_role_id as string | undefined,
  risk_id: req.query.risk_id as string | undefined,
  framework_code: req.query.framework_code as string | undefined,
  status: req.query.status as string | undefined,
  };
  const evidence = await getAllEvidence(tenantId, user ? { userId: user.userId } : undefined, filters);
  res.json(evidence);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/expiring — Get evidence expiring within 30 days
router.get("/expiring", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const evidence = await getExpiringEvidence(tenantId);
  res.json(evidence);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/control/:controlId — Get evidence for a control
router.get("/control/:controlId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const evidence = await getEvidenceForControl(tenantId, req.params.controlId as string);
  res.json(evidence);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// P5.2: GET /api/evidence/suggest-reuse — Suggest existing evidence for reuse
router.get("/suggest-reuse", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const { suggestEvidenceReuse } = await import("../../services/reporting/evidence-reuse.service.js");

  const options = {
  controlId: req.query.controlId as string | undefined,
  title: req.query.title as string | undefined,
  contentHash: req.query.contentHash as string | undefined,
  evidenceType: req.query.evidenceType as string | undefined,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
  };

  // At least one criteria must be provided
  if (!options.controlId && !options.title && !options.contentHash && !options.evidenceType) {
  res.status(400).json({
  error: errMsg('VALIDATION_FAILED', req),
  message: "At least one of controlId, title, contentHash, or evidenceType must be provided"
  });
  return;
  }

  const suggestions = await suggestEvidenceReuse(tenantId, options);
  res.json({ suggestions, count: suggestions.length });
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/** @swagger
 * /evidence:
 *   post:
 *     summary: Submit new evidence with cryptographic hash-chain
 *     tags: [Evidence]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Evidence'
 *     responses:
 *       201:
 *         description: Evidence submitted and chained
 */
router.post("/", authenticate, requirePermission("evidence.item.write"), validate({ body: submitEvidenceBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  // Resolve org_unit_id from user's department for enterprise auth scope binding
  let orgUnitId: number | null = null;
  try {
  const _schema = tenantSchema(tenantId);
  const _deptRes = await safeQuery(
  `SELECT d.id FROM "${_schema}".departments d JOIN "${_schema}".users u ON u.department_id = d.id WHERE u.user_id = $1 LIMIT 1`,
  [req.user?.userId]);
  orgUnitId = getFirstRow(_deptRes)?.id || null;
  } catch { /* best effort */ }
  const evidenceRaw = await submitEvidence(tenantId, { ...req.body, org_unit_id: orgUnitId });
  const evidence = (evidenceRaw ?? {}) as Record<string, unknown> & { evidence_id?: string; control_id?: string; title?: string; content_hash?: string; evidence_type?: string };
  setAuditData(res as any, { action: "create", entityType: "evidence", entityId: evidence.evidence_id as string, afterState: evidence });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'created', entityType: 'evidence', entityId: evidence.evidence_id as string, data: evidence }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence.created' });
  notifyDomainChange(tenantId, 'evidence', 'create', evidence.evidence_id as string);
  pushToTenant(tenantId, buildWSEvent('evidence_submitted' as any, {
  evidenceId: evidence.evidence_id,
  controlId: evidence.control_id,
  title: evidence.title,
  submittedBy: req.user!.userId!,
  }));

  // P5.2: Optionally include reuse suggestions in response if requested
  const includeSuggestions = req.query.includeSuggestions === 'true' || req.body.includeSuggestions === true;
  const response: unknown = { ...(evidence ?? {}) };

  if (includeSuggestions && (evidence.control_id || evidence.title || evidence.content_hash || evidence.evidence_type)) {
  try {
  const { suggestEvidenceReuse } = await import("../../services/reporting/evidence-reuse.service.js");
  const suggestions = await suggestEvidenceReuse(tenantId, {
  controlId: evidence.control_id || undefined,
  title: evidence.title || undefined,
  contentHash: evidence.content_hash || undefined,
  evidenceType: evidence.evidence_type || undefined,
  limit: 5, // Limit suggestions in POST response
  });
  // Exclude the just-created evidence from suggestions

  response.suggestions = suggestions.filter(s => s.evidenceId !== evidence.evidence_id);
  } catch (suggestionErr) {
  // Don't fail the POST if suggestions fail
  logger.warn('Failed to generate reuse suggestions:', suggestionErr);
  }
  }

  res.status(201).json(response);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('Quality gate') || toErrorMessage(err).includes('Attestation') || toErrorMessage(err).includes('Duplicate') ? 400 : 500;
  res.status(status).json({ error: status === 400 ? errMsg('VALIDATION_FAILED', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/:id/version — Submit new version of existing evidence
router.post("/:id/version", authenticate, requirePermission("evidence.item.write"), validate({ body: submitVersionBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const evidence = await submitEvidenceVersion(tenantId, req.params.id as string, req.body);
  setAuditData(res as any, { action: "update", entityType: "evidence", entityId: req.params.id as string, afterState: evidence });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'version_created', entityType: 'evidence', entityId: req.params.id as string, data: evidence } as any)), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence.version_created' });
  notifyDomainChange(tenantId, 'evidence', 'update', req.params.id as string);
  try { await recordActivity(tenantId, { userId: req.user!.userId!, module: 'evidence', action: 'version', entityType: 'evidence', entityId: req.params.id as string, summary: `New evidence version submitted`, changes: {} }); } catch { }
  res.status(201).json(evidence);
  } catch (err: unknown) {
  if (toErrorMessage(err) === "Existing evidence not found") {
  res.status(404).json({ error: errMsg('EVIDENCE_NOT_FOUND', req) });
  return;
  }
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

/** @swagger
 * /evidence/verify:
 *   get:
 *     summary: Verify evidence hash-chain integrity
 *     tags: [Evidence]
 *     responses:
 *       200:
 *         description: Chain verification result
 */
router.get("/verify", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const result = await verifyHashChain(tenantId);
  res.json(result);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/collect — Trigger evidence collection via connectors
router.post("/collect", authenticate, requirePermission("evidence.item.write"), validate({ body: collectEvidenceBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const { connectorId } = req.body;
  const { collectEvidence } = await import('../../services/core/evidence.service.js');
  const result = await (collectEvidence as any)(tenantId, connectorId || 'all');
  setAuditData(res as any, { action: "create", entityType: "evidence", entityId: connectorId || 'all', afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId: req.user!.userId!, module: 'evidence', event: 'collected', entityType: 'evidence', entityId: connectorId || 'all', data: result as unknown as Record<string, unknown> }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence.collected' });
  notifyDomainChange(tenantId, 'evidence', 'create', connectorId || 'all');
  try { await recordActivity(tenantId, { userId: req.user!.userId!, module: 'evidence', action: 'collect', entityType: 'evidence', entityId: connectorId || 'all', summary: `Evidence collection run: ${(result as unknown as Record<string, unknown>).totalCollected || 0} items collected`, changes: {} }); } catch { }
  res.json(result);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/connectors — List evidence connectors
router.get("/connectors", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const { getEvidenceConnectors } = await import('../../services/core/evidence.service.js');
  const connectors = await getEvidenceConnectors(tenantId);
  res.json(connectors);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/status — Get evidence connector status
router.get("/status", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const { getEvidenceStatus } = await import('../../services/core/evidence.service.js');
  const status = await getEvidenceStatus(tenantId);
  res.json(status);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/policy-check — Check evidence policy compliance
router.post("/policy-check", authenticate, requirePermission("evidence.item.read"), validate({ body: policyCheckBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const { controlId, requiredTypes } = req.body;
  const result = await enforceEvidencePolicy(tenantId, controlId, requiredTypes);
  res.json(result);
  } catch (_err: unknown) {
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// PATCH /api/evidence/:id/status — Transition evidence status (strict state machine)
router.patch("/:id/status", authenticate, requirePermission("evidence.item.write"), requireOwnership('evidence'), validate({ body: transitionStatusBody }), lifecycleGate('evidence'), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const { status: newStatus, reason } = req.body;
  if (!newStatus) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await transitionStatus(tenantId, req.params.id, newStatus as EvidenceStatus, userId, reason);
  setAuditData(res as any, { action: "update", entityType: "evidence", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId, userId, module: 'evidence', event: 'status_changed', entityType: 'evidence', entityId: req.params.id, data: result }), { tenantId: tenantId, operation: 'grcEvent:evidence.evidence.status_changed' });
  notifyDomainChange(tenantId, 'evidence', 'update', req.params.id);
  try { await recordActivity(tenantId, { userId, module: 'evidence', action: 'update', entityType: 'evidence', entityId: req.params.id, summary: `Evidence status: ${result.fromStatus} → ${result.toStatus}`, changes: { status: newStatus } }); } catch { }
  res.json(result);
  } catch (err: unknown) {
  const status = ((err as Record<string, unknown>)?.statusCode) || (toErrorMessage(err).includes('not found') ? 404 : 500);
  res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/:id/status-history — Get status transition audit log
router.get("/:id/status-history", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const history = await getStatusHistory(tenantId, req.params.id);
  res.json({ history, count: history.length });
});

// GET /api/evidence/overview/stats — Aggregated overview stats (supports foundation filters)
router.get("/overview/stats", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const filters: Record<string, string | undefined> = {
  department_id: req.query.department_id as string | undefined,
  business_unit_id: req.query.business_unit_id as string | undefined,
  location_id: req.query.location_id as string | undefined,
  owner_role_id: req.query.owner_role_id as string | undefined,
  risk_id: req.query.risk_id as string | undefined,
  framework_code: req.query.framework_code as string | undefined,
  };
  const stats = await getOverviewStats(tenantId, filters);
  res.json(stats);
});

// GET /api/evidence/coverage-dashboard — Coverage %, gap count, quality scores, framework-level breakdown
router.get("/coverage-dashboard", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const dashboard = await getEvidenceCoverageDashboard(tenantId);
  res.json(dashboard);
});

// GET /api/evidence/mappings — Cross-entity mapping browser
router.get("/mappings", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { frameworkId, controlId, riskId, policyId, entityType } = req.query;
  const mappings = await getEvidenceMappings(tenantId, {
  frameworkId: frameworkId as string | undefined,
  controlId: controlId as string | undefined,
  riskId: riskId as string | undefined,
  policyId: policyId as string | undefined,
  entityType: entityType as string | undefined,
  });
  res.json({ mappings, count: mappings.length });
});

// GET /api/evidence/expired — Get expired evidence
router.get("/expired", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const evidence = await getExpiredEvidence(tenantId);
  res.json(evidence);
});

// GET /api/evidence/breakdown — Dashboard aggregate breakdown by type
router.get("/breakdown", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const schema = `tenant_${tenantId}`;
  // Aggregate evidence by type across all controls
  const controlsResult = await safeQuery(
  `SELECT COALESCE(evidence_required, '{}') AS required_types FROM "${schema}".controls WHERE deleted_at IS NULL`
  );
  const requiredMap: Record<string, number> = {};
  for (const row of controlsResult.rows) {
  const types = Array.isArray(row.required_types) ? row.required_types : [];
  for (const t of types) { requiredMap[t] = (requiredMap[t] || 0) + 1; }
  }
  // Count collected evidence per type
  const evidenceResult = await safeQuery(
  `SELECT COALESCE(type, 'document') AS type_code, COUNT(*) AS cnt
  FROM "${schema}".evidence GROUP BY COALESCE(type, 'document')`
  );
  const attachedMap: Record<string, number> = {};
  for (const row of evidenceResult.rows) {
  attachedMap[row.type_code] = parseInt(row.cnt, 10);
  }
  // Build breakdown
  const allTypes = new Set([...Object.keys(requiredMap), ...Object.keys(attachedMap)]);
  const breakdown = Array.from(allTypes).map(typeCode => ({
  typeCode,
  label: typeCode.charAt(0).toUpperCase() + typeCode.slice(1).replace(/_/g, ' '),
  required: requiredMap[typeCode] || 0,
  attached: attachedMap[typeCode] || 0,
  missing: Math.max(0, (requiredMap[typeCode] || 0) - (attachedMap[typeCode] || 0)),
  }));
  res.json(breakdown);
});

// GET /api/evidence/catalog — Search evidence catalog with filters
router.get("/catalog", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
    const { searchCatalog } = await import('../../services/analysis/evidence-catalog.service.js');
    const filters = {
      query: req.query.query as string | undefined,
      evidenceType: req.query.evidenceType as string | undefined,
      sourceSystem: req.query.sourceSystem as string | undefined,
      ownerUserId: req.query.ownerUserId as string | undefined,
      freshnessStatus: req.query.freshnessStatus as string | undefined,
      qualityStatus: req.query.qualityStatus as string | undefined,
      reusableOnly: req.query.reusableOnly === 'true',
      frameworkCode: req.query.frameworkCode as string | undefined,
      status: req.query.status as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    };
    const result = await searchCatalog(req.user!.tenantId!, filters);
    res.json(result);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/catalog/:id — Get single evidence item with hydrated metadata
router.get("/catalog/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  try {
    const { getEvidenceById } = await import('../../services/analysis/evidence-catalog.service.js');
    const evidence = await getEvidenceById(req.user!.tenantId!, req.params.id);
    res.json(evidence);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// PATCH /api/evidence/catalog/:id — Update evidence fields
router.patch("/catalog/:id", authenticate, requirePermission("evidence.item.write"), requireOwnership('evidence'), validate({ body: updateCatalogBody }), async (req: Request, res: Response) => {
  try {
    const { updateEvidence } = await import('../../services/analysis/evidence-catalog.service.js');
    const result = await updateEvidence(req.user!.tenantId!, req.params.id, req.body, req.user!.userId!);
    setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id, afterState: result });
    notifyDomainChange(req.user!.tenantId!, 'evidence', 'update', req.params.id);
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// DELETE /api/evidence/catalog/:id — Soft-delete evidence
router.delete("/catalog/:id", authenticate, requirePermission("evidence.item.write"), validate({ params: idParam }), requireOwnership('evidence'), async (req: Request, res: Response) => {
  try {
    const { softDeleteEvidence } = await import('../../services/analysis/evidence-catalog.service.js');
    const result = await softDeleteEvidence(req.user!.tenantId!, req.params.id, req.user!.userId!, req.body?.reason);
    setAuditData(res as any, { action: 'delete', entityType: 'evidence', entityId: req.params.id, afterState: result });
    notifyDomainChange(req.user!.tenantId!, 'evidence', 'delete', req.params.id);
    res.json({ message: 'Evidence deleted', evidence: result });
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/catalog/:id/archive — Archive evidence
router.post("/catalog/:id/archive", authenticate, requirePermission("evidence.item.write"), validate({ body: createArchiveBody }), async (req: Request, res: Response) => {
  try {
    const { archiveEvidence } = await import('../../services/analysis/evidence-catalog.service.js');
    const result = await archiveEvidence(req.user!.tenantId!, req.params.id, req.user!.userId!);
    setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id, afterState: result });
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

// POST /api/evidence/catalog/:id/restore — Restore soft-deleted evidence
router.post("/catalog/:id/restore", authenticate, requirePermission("evidence.item.write"), validate({ body: createRestoreBody }), async (req: Request, res: Response) => {
  try {
    const { restoreEvidence } = await import('../../services/analysis/evidence-catalog.service.js');
    const result = await restoreEvidence(req.user!.tenantId!, req.params.id, req.user!.userId!);
    setAuditData(res as any, { action: 'update', entityType: 'evidence', entityId: req.params.id, afterState: result });
    res.json(result);
  } catch (err: unknown) {
    const status = ((err as Record<string, unknown>)?.statusCode) || 500;
    res.status((status as any)).json({ error: toErrorMessage(err) || errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

