import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit Universe Routes
// CRUD for audit universe entities
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listUniverse,
  listUniverseWithFoundation,
  getUniverseEntityById,
  createUniverseEntity,
  updateUniverseEntity,
  deleteUniverseEntity,
  getFoundationEntities,
  linkUniverseToFoundation,
} from '../../../services/audit/planning/audit-universe.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createUniverseEntityBody = z.object({
  name: z.string().min(1),
  entityType: z.string().min(1),
}).passthrough();

const updateUniverseEntityBody = z.object({}).passthrough();

const linkFoundationBody = z.object({
  foundationEntityId: z.string().min(1),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── List all universe entities (enriched with foundation org context) ──

router.get("/", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const withFoundation = req.query.withFoundation === 'true';
  const items = withFoundation
  ? await listUniverseWithFoundation(req.tenantId!)
  : await listUniverse(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Get foundation org entities for linking ──────────────────────────

router.get("/foundation-entities", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getFoundationEntities(req.tenantId!);
  res.json(result);
}));

// ── Link universe entity to foundation org ───────────────────────────

router.post("/:id/link-foundation", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: linkFoundationBody }), asyncHandler(async (req, res) => {
  const result = await linkUniverseToFoundation(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "audit_universe", entityId: req.params.id, afterState: result });
  res.json(result);
}));

// ── Get single entity ──────────────────────────────────────────────

router.get("/:id", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getUniverseEntityById(req.tenantId!, req.params.id);
  if (!result) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result);
}));

// ── Create entity ──────────────────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createUniverseEntityBody }), asyncHandler(async (req, res) => {
  const data = await createUniverseEntity(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "audit_universe", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_universe', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_universe.created' });
  res.status(201).json(data);
}));

// ── Update entity ──────────────────────────────────────────────────

router.put("/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updateUniverseEntityBody }), asyncHandler(async (req, res) => {
  const data = await updateUniverseEntity(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "audit_universe", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_universe', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_universe.updated' });
  res.json(data);
}));

// ── Delete entity ──────────────────────────────────────────────────

router.delete("/:id", authenticate, requirePermission("audit.record.manage"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const deleted = await deleteUniverseEntity(req.tenantId!, req.params.id);
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "audit_universe", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'deleted', entityType: 'audit_universe', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_universe.deleted' });
  res.json({ deleted: true, id: req.params.id });
}));

export default router;

