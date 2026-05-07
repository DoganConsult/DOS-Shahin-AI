/**
 * Foundation — SoD exception lifecycle routes (Wave 1 backend completion).
 *
 * Exposes:
 *   GET    /sod/exceptions               List exceptions (filterable by status, user, rule).
 *   POST   /sod/exceptions               Create a new exception (pending).
 *   GET    /sod/exceptions/:id           Get one exception.
 *   POST   /sod/exceptions/:id/approve   Approve an exception (sets effective window).
 *   POST   /sod/exceptions/:id/reject    Reject an exception.
 *   POST   /sod/exceptions/:id/revoke    Revoke an active exception.
 *
 * Backed by dos.foundation_sod_exception (RLS-scoped, see migration
 * 20260512_1000_foundation_sod_exception_review.sql).
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { query } from '../../ports/database.port';
import { writeRateLimiter } from './middleware/rate-limiter';

const READ  = ['admin','foundation_admin','compliance_admin','sod_admin','auditor','foundation.record.read'] as const;
const WRITE = ['admin','foundation_admin','compliance_admin','sod_admin'] as const;

const createExceptionBody = z.object({
  rule_code: z.string().min(1).max(64),
  user_id:   z.string().min(1).max(255),
  business_reason: z.string().min(1).max(2000),
  compensating_control: z.string().max(2000).optional(),
  effective_to: z.string().datetime().optional(),
  context: z.record(z.unknown()).optional(),
});

const approveExceptionBody = z.object({
  effective_to: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});

const rejectExceptionBody = z.object({
  reason: z.string().min(1).max(2000),
});

const revokeExceptionBody = z.object({
  reason: z.string().min(1).max(2000).optional(),
});

const router = Router();
router.use(authenticate, requireTenantId, auditMiddleware('foundation_sod_exception'));

router.get('/',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const params: unknown[] = [tenantId];
    const where: string[] = [`tenant_id = $1`];
    if (typeof req.query.status === 'string') {
      params.push(req.query.status);
      where.push(`status = $${params.length}`);
    }
    if (typeof req.query.userId === 'string') {
      params.push(req.query.userId);
      where.push(`user_id = $${params.length}`);
    }
    if (typeof req.query.ruleCode === 'string') {
      params.push(req.query.ruleCode);
      where.push(`rule_code = $${params.length}`);
    }
    const result = await query(
      `SELECT exception_id, tenant_id, rule_code, user_id, context,
              business_reason, compensating_control, status,
              approved_by, approved_at, rejected_reason,
              effective_from, effective_to, created_by, created_at, updated_at
         FROM dos.foundation_sod_exception
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT 200`,
      params,
    );
    res.json({ success: true, data: result.rows });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: createExceptionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const body = req.body as z.infer<typeof createExceptionBody>;
    const result = await query(
      `INSERT INTO dos.foundation_sod_exception
         (tenant_id, rule_code, user_id, context, business_reason,
          compensating_control, effective_to, created_by, status)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,'pending')
       RETURNING *`,
      [
        tenantId, body.rule_code, body.user_id,
        JSON.stringify(body.context ?? {}),
        body.business_reason, body.compensating_control ?? null,
        body.effective_to ?? null, req.user!.userId,
      ],
    );
    setAuditData(res, {
      entityId: result.rows[0].exception_id,
      entityType: 'sod_exception',
      action: 'create',
    });
    res.status(201).json({ success: true, data: result.rows[0] });
  }),
);

router.get('/:id',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      `SELECT * FROM dos.foundation_sod_exception
        WHERE exception_id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId!],
    );
    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'not_found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  }),
);

router.post('/:id/approve',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: approveExceptionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof approveExceptionBody>;
    const result = await query(
      `UPDATE dos.foundation_sod_exception
          SET status='approved', approved_by=$1, approved_at=now(),
              effective_to=COALESCE($2, effective_to),
              updated_at=now()
        WHERE exception_id=$3 AND tenant_id=$4 AND status IN ('pending')
        RETURNING *`,
      [req.user!.userId, body.effective_to ?? null, req.params.id, req.tenantId!],
    );
    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'not_found_or_not_pending' });
      return;
    }
    setAuditData(res, {
      entityId: req.params.id,
      entityType: 'sod_exception',
      action: 'approve',
    });
    res.json({ success: true, data: result.rows[0] });
  }),
);

router.post('/:id/reject',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: rejectExceptionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof rejectExceptionBody>;
    const result = await query(
      `UPDATE dos.foundation_sod_exception
          SET status='rejected', rejected_reason=$1, updated_at=now()
        WHERE exception_id=$2 AND tenant_id=$3 AND status='pending'
        RETURNING *`,
      [body.reason, req.params.id, req.tenantId!],
    );
    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'not_found_or_not_pending' });
      return;
    }
    setAuditData(res, {
      entityId: req.params.id,
      entityType: 'sod_exception',
      action: 'reject',
    });
    res.json({ success: true, data: result.rows[0] });
  }),
);

router.post('/:id/revoke',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: revokeExceptionBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof revokeExceptionBody>;
    const result = await query(
      `UPDATE dos.foundation_sod_exception
          SET status='revoked',
              rejected_reason=COALESCE($1, rejected_reason),
              updated_at=now()
        WHERE exception_id=$2 AND tenant_id=$3 AND status='approved'
        RETURNING *`,
      [body.reason ?? null, req.params.id, req.tenantId!],
    );
    if (!result.rows.length) {
      res.status(404).json({ success: false, error: 'not_found_or_not_approved' });
      return;
    }
    setAuditData(res, {
      entityId: req.params.id,
      entityType: 'sod_exception',
      action: 'revoke',
    });
    res.json({ success: true, data: result.rows[0] });
  }),
);

export { router as sodExceptionRouter };
