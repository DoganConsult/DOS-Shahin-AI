import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Audit Packages CRUD — list, create, get, finalize, delete.
 * DB-backed via audit_packages table (database.ts canonical).
 */
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { emitEvent } from '../../../ports/events.port';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRowOrThrow } from '../../../../../utils/db-utils';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../../../ports/ai.port';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createAuditPackageBody = z.object({
  name: z.string().optional(),
  frameworkId: z.string().optional(),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

router.get('/', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  const s = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT package_id AS id, name, status, control_count, controls, created_at
     FROM "${s}".audit_packages WHERE deleted_at IS NULL ORDER BY created_at DESC`
  );
  res.json({ packages: result.rows });
});

router.get('/:id', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('audit.record.read'), async (req: Request, res: Response) => {
  const s = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT package_id AS id, name, status, control_count, controls, created_at
     FROM "${s}".audit_packages WHERE package_id = $1 AND deleted_at IS NULL`,
    [req.params.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Audit package not found' });
    return;
  }
  res.json({ package: getFirstRowOrThrow(result, 'Audit package not found') });
});

router.post('/', authenticate, requirePermission('audit.record.manage'), validate({ body: createAuditPackageBody }), async (req: Request, res: Response) => {
  const s = tenantSchema(req.tenantId!);
  const { name, frameworkId } = req.body || {};
  const userId = req.user!.userId!;
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_packages (name, framework_id, created_by)
     VALUES ($1, $2, $3)
     RETURNING package_id AS id, name, status, control_count, controls, created_at`,
    [name || 'New Audit Package', frameworkId || null, userId]
  );
  const created = getFirstRowOrThrow(result, 'Audit package creation failed');
  setAuditData(res as any, { action: "create", entityType: "audit_package", entityId: created.id, afterState: created });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId, module: 'audit', event: 'created', entityType: 'audit_package', entityId: created.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_package.created' });
  res.status(201).json(created);
});

router.post('/:id/finalize', authenticate, requirePermission('audit.record.manage'), validate({ params: idParam }), async (req: Request, res: Response) => {
  const s = tenantSchema(req.tenantId!);
  const enforcement = await enforceStatusTransition(req.tenantId!, {
    moduleCode: 'audit', table: 'audit_packages', idColumn: 'package_id',
    entityId: req.params.id, toStatus: 'finalized', actorUserId: req.user!.userId!,
  });
  if (!enforcement.success && enforcement.blocked) {
    res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return;
  }
  if (!enforcement.success) {
    await safeQuery(`UPDATE "${s}".audit_packages SET status = 'finalized', updated_at = NOW() WHERE package_id = $1 AND deleted_at IS NULL`, [req.params.id]);
  }
  const result = await safeQuery(
    `SELECT package_id AS id, name, status, control_count, controls, created_at FROM "${s}".audit_packages WHERE package_id = $1`, [req.params.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Audit package not found' }); return;
  }
  const pkg = getFirstRowOrThrow(result, 'Audit package not found');
  setAuditData(res as any, { action: "update", entityType: "audit_package", entityId: req.params.id, afterState: pkg });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_package', entityId: req.params.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_package.updated' });
  res.json(pkg);
});

router.delete('/:id', validate({ body: genericPayloadSchema }), authenticate, requirePermission('audit.record.manage'), async (req: Request, res: Response) => {
  const s = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `UPDATE "${s}".audit_packages SET deleted_at = NOW()
     WHERE package_id = $1 AND deleted_at IS NULL
     RETURNING package_id`,
    [req.params.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Audit package not found' });
    return;
  }
  setAuditData(res as any, { action: "delete", entityType: "audit_package", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'deleted', entityType: 'audit_package', entityId: req.params.id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_package.deleted' });
  res.status(204).send();
});

export default router;

