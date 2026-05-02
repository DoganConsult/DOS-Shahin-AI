import { Router, Request, Response } from 'express';
import { authenticate, requirePermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { query } from '../../ports/database.port';
import { writeRateLimiter } from './middleware/rate-limiter';
import { UserServiceError } from '../../contracts/user-errors';

export const invitationsRouter = Router();
invitationsRouter.use(authenticate);
invitationsRouter.use(requireTenantId);
invitationsRouter.use(auditMiddleware('invitation'));

invitationsRouter.get('/',
  requirePermission('invitation.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const status = String(req.query.status || '').trim();
    const params: unknown[] = [req.tenantId!];
    let where = 'tenant_id = $1';
    if (status) { params.push(status); where += ` AND status = $${params.length}`; }
    params.push(limit, offset);
    const result = await query(
      `SELECT invitation_id, email, display_name, role, department_id, status,
              batch_id, invited_by, invited_at, accepted_at, expires_at
         FROM dos.invitations
        WHERE ${where}
        ORDER BY invited_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ invitations: result.rows, total: result.rows.length });
  }),
);

invitationsRouter.post('/',
  writeRateLimiter,
  requirePermission('invitation.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, display_name, role, department_id } = req.body || {};
    if (!email) throw new UserServiceError('VALIDATION_FAILED', 'email is required');
    const actor = req.user!.userId;
    const result = await query(
      `INSERT INTO dos.invitations (tenant_id, email, display_name, role, department_id, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, email) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             role = EXCLUDED.role,
             department_id = EXCLUDED.department_id,
             invited_by = EXCLUDED.invited_by,
             status = 'pending',
             invited_at = NOW(),
             expires_at = NOW() + INTERVAL '14 days'
       RETURNING *`,
      [req.tenantId!, email, display_name || null, role || null, department_id || null, actor],
    );
    setAuditData(res, { action: 'invitation.create', entityType: 'invitation', entityId: result.rows[0].invitation_id });
    res.status(201).json({ invitation: result.rows[0] });
  }),
);

invitationsRouter.post('/:id/resend',
  writeRateLimiter,
  requirePermission('invitation.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      `UPDATE dos.invitations
          SET invited_at = NOW(),
              expires_at = NOW() + INTERVAL '14 days',
              status = 'pending'
        WHERE invitation_id = $1 AND tenant_id = $2
        RETURNING *`,
      [req.params.id, req.tenantId!],
    );
    if (result.rows.length === 0) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', 'invitation not found');
    setAuditData(res, { action: 'invitation.resend', entityType: 'invitation', entityId: req.params.id });
    res.json({ invitation: result.rows[0] });
  }),
);

invitationsRouter.delete('/:id',
  writeRateLimiter,
  requirePermission('invitation.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await query(
      `DELETE FROM dos.invitations WHERE invitation_id = $1 AND tenant_id = $2 RETURNING invitation_id`,
      [req.params.id, req.tenantId!],
    );
    if (result.rows.length === 0) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', 'invitation not found');
    setAuditData(res, { action: 'invitation.delete', entityType: 'invitation', entityId: req.params.id });
    res.json({ success: true });
  }),
);
