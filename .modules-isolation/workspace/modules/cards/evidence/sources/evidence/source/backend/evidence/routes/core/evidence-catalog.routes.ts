import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Shahin-Ai — Evidence Catalog Routes
// Catalog CRUD, quality gate validation,
// completeness checking, expiring evidence
// Requirements: 4.1, 4.2, 4.5, 4.6
// ============================================

import { safeQuery, tenantSchema as _tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  getCatalog,
  createCatalogEntry,
  validateEvidence,
  checkCompleteness,
  getExpiringEvidence,
} from '../../services/analysis/evidence-catalog.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

import { auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';

import { updateCatalogBody, createCatalogBody, createValidateBody } from '../../schemas/evidence.schemas';
import { validate } from '@dos/platform-core/http';
const router = Router();
router.use(moduleStack('evidence'));
router.use(auditMiddleware("evidence"));
router.use(automationMiddleware("evidence"));

// GET /api/evidence-catalog — Alias for /catalog/all (frontend GrcService compatibility)
router.get("/", authenticate, requirePermission("evidence.item.read"), validate({ query: z.record(z.unknown()) }), async (req: Request, res: Response) => {
  // Forward to /catalog/all handler
  req._catalogAll = true;
  return catalogAllHandler(req, res);
});

// GET /api/evidence-catalog/catalog/all — Get all evidence catalog entries with completeness
router.get("/catalog/all", authenticate, requirePermission("evidence.item.read"), validate({ query: z.record(z.unknown()) }), async (req: Request, res: Response) => {
  return catalogAllHandler(req, res);
});

async function catalogAllHandler(req: Request, res: Response) {
  const tenantId = req.tenantId!;
  const schema = `tenant_${tenantId}`;
  const controlsResult = await safeQuery(
    `SELECT c.control_id, c.title AS control_title
     FROM "${schema}".controls c ORDER BY c.title ASC`
  );
  const catalog: unknown[] = [];
  for (const ctrl of controlsResult.rows) {
    const reqResult = await safeQuery(
      `SELECT evidence_type FROM "${schema}".evidence_catalog WHERE control_id = $1`,
      [ctrl.control_id]
    );
    const evResult = await safeQuery(
      `SELECT DISTINCT title FROM "${schema}".evidence WHERE control_id = $1`,
      [ctrl.control_id]
    );
    const requiredTypes = reqResult.rows.map(( r: Record<string, unknown>) => r.evidence_type);
    const existingTypes = new Set(evResult.rows.map(( r: Record<string, unknown>) => r.title));

    const missing = requiredTypes.filter((t: string) => !existingTypes.has(t));
    const required = requiredTypes.length || 1;
    const collected = required - missing.length;
    const completeness = Math.round((collected / required) * 100);

    const expiryResult = await safeQuery(
      `SELECT COUNT(*) AS cnt FROM "${schema}".evidence
       WHERE control_id = $1 AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'
         AND expiry_date >= CURRENT_DATE`,
      [ctrl.control_id]
    );

    catalog.push({
      control_id: ctrl.control_id,
      control_title: ctrl.control_title,
      required,
      collected,
      completeness,
      gate_status: missing.length === 0 ? 'passed' : 'incomplete',
      expiring: parseInt((getFirstRow(expiryResult) as Record<string, unknown>)?.cnt as string || '0', 10) > 0,
      missing,
    });
  }
  res.json({ catalog, count: catalog.length });
}

// PUT /api/evidence-catalog/catalog/:controlId — Update evidence catalog entry for a control
router.put("/catalog/:controlId", authenticate, requirePermission("evidence.item.write"), validate({ body: updateCatalogBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = `tenant_${tenantId}`;
  const { controlId } = req.params;
  const { evidenceType, required, notes } = req.body;
  if (!evidenceType) {
    res.status(400).json({ error: "evidenceType is required" });
    return;
  }
  const result = await safeQuery(
    `INSERT INTO "${schema}".evidence_catalog (control_id, evidence_type, required, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (control_id, evidence_type) DO UPDATE SET
       required = COALESCE(EXCLUDED.required, evidence_catalog.required),
       notes = COALESCE(EXCLUDED.notes, evidence_catalog.notes)
     RETURNING *`,
    [controlId, evidenceType, required ?? true, notes || null]
  );
  const catalogRow = getFirstRow(result)!;
  setAuditData(res as any, { action: "update", entityType: "evidence_catalog", entityId: controlId, afterState: catalogRow });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'evidence', event: 'updated', entityType: 'evidence_catalog', entityId: controlId }), { tenantId: req.tenantId!, operation: 'grcEvent:evidence.evidence_catalog.updated' });
  res.json(catalogRow || { success: true });
});

// GET /api/evidence-catalog/catalog/:controlId — Get evidence catalog for a control
router.get("/catalog/:controlId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { controlId } = req.params;
  const entries = await getCatalog(tenantId, controlId);
  res.status(200).json({ entries, count: entries.length });
});

// POST /api/evidence-catalog/catalog — Create a new catalog entry
router.post("/catalog", authenticate, requirePermission("evidence.item.write"), validate({ body: createCatalogBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const entry = req.body;
  if (!entry || !entry.controlId || !entry.evidenceType) {
    res.status(400).json({ error: "controlId and evidenceType are required" });
    return;
  }
  const result = await createCatalogEntry(tenantId, entry);

  setAuditData(res as any, { action: "create", entityType: "evidence_catalog", entityId: (result as Record<string, unknown>).catalog_id ?? (result as Record<string, unknown>).catalogId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'evidence', event: 'created', entityType: 'evidence_catalog', entityId: req.params.id || '' }), { tenantId: req.tenantId!, operation: 'grcEvent:evidence.evidence_catalog.created' });
  res.status(201).json(result);
});

// POST /api/evidence-catalog/evidence/validate — Validate evidence against quality gate
router.post("/evidence/validate", authenticate, requirePermission("evidence.item.read"), validate({ body: createValidateBody }), async (req: Request, res: Response) => {
  const submission = req.body;
  if (!submission) {
    res.status(400).json({ error: "Evidence submission is required" });
    return;
  }
  const result = validateEvidence(submission);
  setAuditData(res as any, { action: "create", entityType: "evidence_catalog", entityId: submission.evidenceId ?? "validation", afterState: result });
  swallow(EC.EVENT_BUS, emitEvent({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'evidence', event: 'created', entityType: 'evidence_catalog', entityId: '' }), { tenantId: req.tenantId!, operation: 'grcEvent:evidence.evidence_catalog.created' });
  res.status(200).json(result);
});

// GET /api/evidence-catalog/evidence/completeness/:controlId — Check evidence completeness
router.get("/evidence/completeness/:controlId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { controlId } = req.params;
  const result = await checkCompleteness(tenantId, controlId);
  res.status(200).json(result);
});

// GET /api/evidence-catalog/evidence/expiring — Get evidence approaching expiry
router.get("/evidence/expiring", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const daysThreshold = parseInt(req.query.days as string) || 30;
  const items = await getExpiringEvidence(tenantId, daysThreshold);
  res.status(200).json({ items, count: items.length });
});

export default router;

