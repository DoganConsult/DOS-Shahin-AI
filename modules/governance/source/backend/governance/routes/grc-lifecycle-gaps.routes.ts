import { Request, Response, Router } from 'express';
import { z } from "zod";
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';

const genericPayloadSchema = z.record(z.unknown());
/**
 * GRC Lifecycle Gap Detection Routes — exposes governance gap scanning,
 * gap listing, and gap resolution endpoints.
 *
 * Delegates to governance-gap-scanner.service.ts for detection logic.
 * Patch 4 §2.1: Governance module owns governance gap visibility.
 * Law 12: Audit by default — every scan and resolution is logged.
 */
import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../../ports/events.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { toErrorMessage } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { auditMiddleware, setAuditData, automationMiddleware, validate, asyncHandler } from '../ports/middleware.port';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('governance.lifecycle_gaps'));
router.use(automationMiddleware('governance.lifecycle_gaps'));

// ── Zod Schemas ──────────────────────────────────────────────────────────

const scanBody = z.object({
  entityTypes: z.array(z.string().min(1)).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  autoCreateTasks: z.boolean().default(false),
});

const resolveBody = z.object({
  resolution: z.enum(['remediated', 'accepted', 'deferred', 'false_positive']),
  note: z.string().max(2000).optional(),
  deferUntil: z.string().datetime().optional(),
});

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.enum(['open', 'in_progress', 'resolved', 'deferred']).optional(),
  entityType: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

// ── List detected gaps (paginated, filterable) ───────────────────────────

router.get('/', requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const { page, limit, status, entityType, severity } = listQuery.parse(req.query);
  const offset = (page - 1) * limit;

  let where = 'WHERE g.deleted_at IS NULL';
  const params: unknown[] = [];
  let idx = 1;
  if (status) { where += ` AND g.status = $${idx++}`; params.push(status); }
  if (entityType) { where += ` AND g.entity_type = $${idx++}`; params.push(entityType); }
  if (severity) { where += ` AND g.severity = $${idx++}`; params.push(severity); }

  const [countRes, dataRes] = await Promise.all([
    safeQuery(`SELECT COUNT(*)::int as total FROM "${schema}".governance_gaps g ${where}`, params),
    safeQuery(
      `SELECT g.gap_id, g.entity_type, g.entity_id, g.gap_type, g.severity, g.status,
              g.description, g.detected_at, g.resolved_at, g.resolved_by,
              g.resolution_note, g.task_id
       FROM "${schema}".governance_gaps g
       ${where}
       ORDER BY CASE g.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                g.detected_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, limit, offset],
    ),
  ]).catch(() => [{ rows: [{ total: 0 }] }, { rows: [] }]);

  const total = countRes.rows[0]?.total ?? 0;
  res.json({
    success: true,
    data: dataRes.rows,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
}));

// ── Get single gap detail ────────────────────────────────────────────────

router.get('/:gapId', requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `SELECT * FROM "${schema}".governance_gaps WHERE gap_id = $1 AND deleted_at IS NULL`,
    [req.params.gapId],
  );
  if (rows.length === 0) { res.status(404).json({ error: 'Gap not found' }); return; }
  res.json({ success: true, data: rows[0] });
}));

// ── Trigger gap detection scan ───────────────────────────────────────────

router.post('/scan', requirePermission('governance.record.manage'), validate({ body: scanBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;

  try {
    const { runGovernanceAutoFire } = await import('../services/governance/governance-gap-scanner.service.js');
    const result = await runGovernanceAutoFire(tenantId);

    setAuditData(res as any, {
      action: 'gap_scan',
      entityType: 'governance_gap',

      afterState: { gapsDetected: result.created, tasksCreated: result.tasks },
    });
    swallow(EC.EVENT_BUS, emitEvent(({
          tenantId, userId, module: 'governance', event: 'scanned',
          entityType: 'governance_gap', entityId: 'scan',

          data: { gapsDetected: result.created, tasksCreated: result.tasks },
        } as any)), { tenantId, operation: 'grcEvent:governance.gap.scanned' });

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    res.status(500).json({ error: toErrorMessage(err) });
  }
}));

// ── Resolve a gap ────────────────────────────────────────────────────────

router.put('/:gapId/resolve', requirePermission('governance.record.manage'), validate({ body: resolveBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const schema = tenantSchema(tenantId);
  const { gapId } = req.params;
  const { resolution, note, deferUntil } = req.body;

  const before = await safeQuery(
    `SELECT * FROM "${schema}".governance_gaps WHERE gap_id = $1 AND deleted_at IS NULL`,
    [gapId],
  );
  if (before.rows.length === 0) { res.status(404).json({ error: 'Gap not found' }); return; }
  if (before.rows[0].status === 'resolved') { res.status(409).json({ error: 'Gap already resolved' }); return; }

  const newStatus = resolution === 'deferred' ? 'deferred' : 'resolved';
  const { rows } = await safeQuery(
    `UPDATE "${schema}".governance_gaps
     SET status = $1, resolved_by = $2, resolved_at = NOW(), resolution_note = $3,
         resolution_type = $4, defer_until = $5, updated_at = NOW()
     WHERE gap_id = $6 AND deleted_at IS NULL
     RETURNING *`,
    [newStatus, userId, note ?? null, resolution, deferUntil ?? null, gapId],
  );

  setAuditData(res as any, {
    action: 'resolve_gap',
    entityType: 'governance_gap',
    entityId: gapId,
    beforeState: before.rows[0],
    afterState: rows[0],
  });
  swallow(EC.EVENT_BUS, emitEvent(({
      tenantId, userId, module: 'governance', event: 'resolved',
      entityType: 'governance_gap', entityId: gapId,
      data: { resolution, note },
    } as any)), { tenantId, operation: 'grcEvent:governance.gap.resolved' });

  res.json({ success: true, data: rows[0] });
}));

// ── Gap summary/statistics ───────────────────────────────────────────────

router.get('/summary/stats', requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `SELECT
       COUNT(*)::int as total,
       COUNT(*) FILTER (WHERE status = 'open')::int as open,
       COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
       COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved,
       COUNT(*) FILTER (WHERE status = 'deferred')::int as deferred,
       COUNT(*) FILTER (WHERE severity = 'critical')::int as critical,
       COUNT(*) FILTER (WHERE severity = 'high')::int as high
     FROM "${schema}".governance_gaps
     WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total: 0, open: 0, in_progress: 0, resolved: 0, deferred: 0, critical: 0, high: 0 }] }));

  res.json({ success: true, data: rows[0] });
}));

export default router;

