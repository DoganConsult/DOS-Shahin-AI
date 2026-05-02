import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { authenticate, requireAnyPermission, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler, auditMiddleware } from '@dos/platform-core/http';
import { query } from '@dos/db';

// W5.F5.1 — Foundation-owned RoPA surface, mounted in user-service when no
// dedicated privacy-service is configured. Backed by public.privacy_processing_activities.

export const privacyOpsRouter = Router();
privacyOpsRouter.use(authenticate);
privacyOpsRouter.use(requireTenantId);
privacyOpsRouter.use(auditMiddleware('privacy_ops'));

privacyOpsRouter.get('/ropa',
  requireAnyPermission('admin', 'privacy_admin', 'compliance_admin', 'privacy_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const r = await query(
      `SELECT activity_id, tenant_id, name AS name_en, name_ar, purpose AS description,
              lawful_basis AS legal_basis, data_categories, retention_period, controller, processor,
              cross_border, status, created_at, updated_at
         FROM public.privacy_processing_activities
        WHERE tenant_id = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3`,
      [req.tenantId!, limit, offset],
    );
    const c = await query(
      `SELECT COUNT(*)::int AS count FROM public.privacy_processing_activities WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [req.tenantId!],
    );
    res.json({ activities: r.rows, total: c.rows[0]?.count ?? 0, limit, offset });
  }),
);

privacyOpsRouter.post('/ropa',
  requireAnyPermission('admin', 'privacy_admin', 'compliance_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const b = req.body ?? {};
    const name = String(b.name_en ?? b.name ?? '').trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'name_en (or name) required' });
      return;
    }
    const id = randomUUID();
    const cats = Array.isArray(b.data_categories) ? b.data_categories : (b.data_categories ? [String(b.data_categories)] : []);
    const r = await query(
      `INSERT INTO public.privacy_processing_activities
         (activity_id, tenant_id, name, name_ar, purpose, lawful_basis, data_categories,
          retention_period, controller, processor, cross_border, description, status, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::text[], $8, $9, $10, COALESCE($11,false), $12, COALESCE($13,'active'), $14, NOW(), NOW())
       RETURNING *`,
      [id, req.tenantId!, name, b.name_ar ?? null, b.description ?? b.purpose ?? null,
       b.legal_basis ?? b.lawful_basis ?? null, cats,
       b.retention_period ?? null, b.controller ?? null, b.processor ?? null,
       b.cross_border ?? false, b.description ?? null, b.status ?? null, (req as any).user?.userId ?? null],
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  }),
);

privacyOpsRouter.put('/ropa/:id',
  requireAnyPermission('admin', 'privacy_admin', 'compliance_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const b = req.body ?? {};
    const cats = Array.isArray(b.data_categories) ? b.data_categories : null;
    const r = await query(
      `UPDATE public.privacy_processing_activities
          SET name = COALESCE($3, name),
              name_ar = COALESCE($4, name_ar),
              purpose = COALESCE($5, purpose),
              lawful_basis = COALESCE($6, lawful_basis),
              data_categories = COALESCE($7::text[], data_categories),
              retention_period = COALESCE($8, retention_period),
              controller = COALESCE($9, controller),
              processor = COALESCE($10, processor),
              cross_border = COALESCE($11, cross_border),
              description = COALESCE($12, description),
              status = COALESCE($13, status),
              updated_at = NOW()
        WHERE activity_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING *`,
      [req.params.id, req.tenantId!, b.name_en ?? b.name ?? null, b.name_ar ?? null,
       b.description ?? b.purpose ?? null, b.legal_basis ?? b.lawful_basis ?? null, cats,
       b.retention_period ?? null, b.controller ?? null, b.processor ?? null,
       b.cross_border ?? null, b.description ?? null, b.status ?? null],
    );
    if (r.rows.length === 0) {
      res.status(404).json({ success: false, error: 'RoPA entry not found' });
      return;
    }
    res.json({ success: true, data: r.rows[0] });
  }),
);

privacyOpsRouter.delete('/ropa/:id',
  requireAnyPermission('admin', 'privacy_admin', 'compliance_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const r = await query(
      `UPDATE public.privacy_processing_activities
          SET deleted_at = NOW(), updated_at = NOW()
        WHERE activity_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        RETURNING activity_id`,
      [req.params.id, req.tenantId!],
    );
    if (r.rows.length === 0) {
      res.status(404).json({ success: false, error: 'RoPA entry not found' });
      return;
    }
    res.json({ success: true, message: 'RoPA entry deleted' });
  }),
);
