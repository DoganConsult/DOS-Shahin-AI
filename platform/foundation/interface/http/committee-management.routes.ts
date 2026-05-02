import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './committees.service';
import { createCommitteeBody, addCommitteeMemberBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';
import { sendCsv } from './csv.util';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('committee'));

router.get('/',
  requireAnyPermission('admin', 'org_admin', 'committee_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await svc.listCommittees(req.tenantId!, req.query.status as string | undefined);
    res.json({ success: true, data: rows });
  }),
);

// W6.F6.4 — CSV export of committees list.
router.get('/export',
  requireAnyPermission('admin', 'org_admin', 'committee_read'),
  asyncHandler(async (req: Request, res: Response) => {
    const rows = await svc.listCommittees(req.tenantId!, req.query.status as string | undefined);
    sendCsv(res, 'committees',
      ['committee_id', 'name', 'name_ar', 'committee_type', 'status', 'chair_user_id', 'created_at'],
      rows as any[]);
  }),
);

router.get('/:id',
  requireAnyPermission('admin', 'org_admin', 'committee_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getCommittee(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.get('/:id/members',
  requireAnyPermission('admin', 'org_admin', 'committee_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listMembers(req.tenantId!, req.params.id) });
  }),
);

router.post('/',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: createCommitteeBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createCommittee(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.committee_id, entityType: 'committee', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.post('/:id/members',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  validate({ body: addCommitteeMemberBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.addMember(req.tenantId!, req.params.id, req.body.user_id, req.body.role_in_committee);
    setAuditData(res, { entityId: row.member_id, entityType: 'committee_member', action: 'add' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.delete('/:id/members/:memberId',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.removeMember(req.tenantId!, req.params.id, req.params.memberId);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee_member', id: req.params.memberId });
    setAuditData(res, { entityId: req.params.memberId, entityType: 'committee_member', action: 'remove' });
    res.json({ success: true, message: 'Member removed from committee' });
  }),
);

// W4.F4.1 — update / delete committee + meetings sub-resource.
router.put('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updateCommittee(req.tenantId!, req.params.id, req.body ?? {});
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'committee', action: 'update' });
    res.json({ success: true, data: row });
  }),
);

router.delete('/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deleteCommittee(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'committee', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'committee', action: 'delete' });
    res.json({ success: true, message: 'Committee deleted' });
  }),
);

router.get('/:id/meetings',
  requireAnyPermission('admin', 'org_admin', 'committee_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listMeetings(req.tenantId!, req.params.id) });
  }),
);

router.post('/:id/meetings',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    if (!body.title || !body.scheduled_at) {
      res.status(400).json({ success: false, error: 'title and scheduled_at required' });
      return;
    }
    const row = await svc.createMeeting(req.tenantId!, req.params.id, body, req.user!.userId);
    setAuditData(res, { entityId: row.meeting_id, entityType: 'committee_meeting', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

export { router as committeeManagementRouter };
