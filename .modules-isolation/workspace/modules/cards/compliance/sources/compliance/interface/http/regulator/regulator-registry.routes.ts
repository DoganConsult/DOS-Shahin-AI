import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Regulator Registry Routes
// CRUD for regulators stored in the
// reference_categories table with
// category_type = 'regulator'.
// ============================================


import { authenticate, requirePermission } from '../../../ports/auth.port';
import { emitEvent } from '../../../ports/events.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { v4 as uuid } from 'uuid';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../../../ports/platform.port';
import { getFirstRow } from '@dos/db';
import { auditMiddleware, setAuditData, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createRegulatorBody, updateRegulatorBody, genericComplianceSchema } from "../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('governance'));

// GET / — List all regulators
router.get('/', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('governance.record.read'), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".reference_categories WHERE category_type = 'regulator' AND status != 'inactive' ORDER BY created_at DESC`
  );
  res.json({ regulators: result.rows, count: result.rows.length });
});

// GET /:id — Get a single regulator
router.get('/:id', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('governance.record.read'), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".reference_categories WHERE category_id = $1 AND category_type = 'regulator'`,
    [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: 'Regulator not found' }); return; }
  res.json(getFirstRow(result));
});

// POST / — Create a new regulator
router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createRegulatorBody }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const id = uuid();
  const { category_name, description, metadata } = req.body;
  if (!category_name) { res.status(400).json({ error: 'category_name is required' }); return; }

  const result = await safeQuery(
    `INSERT INTO "${schema}".reference_categories (category_id, category_type, category_name, description, metadata, status, created_by, created_at)
     VALUES ($1, 'regulator', $2, $3, $4, 'active', $5, NOW()) RETURNING *`,
    [id, category_name, description || '', metadata ? JSON.stringify(metadata) : '{}', userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'regulator', entityId: id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'created', entityType: 'regulator', entityId: id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.regulator.created' });
  res.status(201).json(getFirstRow(result));
});

// PUT /:id — Update a regulator
router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateRegulatorBody }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const allowedCols = ['category_name', 'description', 'metadata', 'status'];
  const cols = Object.keys(req.body).filter(k => allowedCols.includes(k));
  if (cols.length === 0) { res.status(400).json({ error: 'No valid fields to update' }); return; }

  if (cols.includes('status') && req.body.status) {
    const enforcement = await enforceStatusTransition(tenantId, {
      moduleCode: 'governance', table: 'reference_categories', idColumn: 'category_id',
      entityId: req.params.id, toStatus: req.body.status, actorUserId: userId,
    });
    if (enforcement.blocked) { res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return; }
  }

  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => c === 'metadata' ? JSON.stringify(req.body[c]) : req.body[c]);

  const result = await safeQuery(
    `UPDATE "${schema}".reference_categories SET ${sets.join(', ')}, updated_at = NOW() WHERE category_id = $1 AND category_type = 'regulator' RETURNING *`,
    [req.params.id, ...vals]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: 'Regulator not found' }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'regulator', entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'updated', entityType: 'regulator', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.regulator.updated' });
  res.json(getFirstRow(result));
});

// DELETE /:id — Soft-delete a regulator (set status to inactive)
router.delete('/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const enforcement = await enforceStatusTransition(tenantId, {
    moduleCode: 'governance', table: 'reference_categories', idColumn: 'category_id',
    entityId: req.params.id, toStatus: 'inactive', actorUserId: userId,
  });
  if (enforcement.blocked) { res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return; }
  if (!enforcement.success) {
    await safeQuery(
      `UPDATE "${schema}".reference_categories SET status = 'inactive', updated_at = NOW() WHERE category_id = $1 AND category_type = 'regulator' AND status != 'inactive'`,
      [req.params.id]);
  }
  const result = await safeQuery(`SELECT category_id FROM "${schema}".reference_categories WHERE category_id = $1 AND category_type = 'regulator'`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: 'Regulator not found' }); return; }
  setAuditData(res as any, { action: 'delete', entityType: 'regulator', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'deleted', entityType: 'regulator', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.regulator.deleted' });
  res.json({ deleted: true });
});

export default router;

