import { Router, type Request, type Response } from 'express';
import { authenticate, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { writeRateLimiter } from './middleware/rate-limiter';
import { requireAdmin } from './middleware/ownership';
import { UserServiceError } from '../../contracts/user-errors';
import * as svc from './teams.service';
import { z } from 'zod';

const listTeamsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  status: z.string().max(50).optional(),
});

const createTeamBody = z.object({
  name_en: z.string().min(1).max(255),
  code: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  bu_id: z.string().uuid().optional().nullable(),
  owner_user_id: z.string().max(64).optional().nullable(),
});

const updateTeamBody = z.object({
  name_en: z.string().min(1).max(255).optional(),
  code: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  department_id: z.string().uuid().optional().nullable(),
  bu_id: z.string().uuid().optional().nullable(),
  status: z.string().max(50).optional(),
  owner_user_id: z.string().max(64).optional().nullable(),
});

const addMemberBody = z.object({
  userId: z.string().max(64),
  roleInTeam: z.string().min(1).max(100).optional(),
});

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('team'));

router.get(
  '/',
  validate({ query: listTeamsQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const status = req.query.status as string | undefined;
    const result = await svc.listTeams(req.tenantId!, { page, pageSize, status });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

router.post(
  '/',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: createTeamBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createTeam(req.tenantId!, req.body);
    setAuditData(res, { action: 'team.create', entityType: 'team', entityId: row.team_id, afterState: row });
    res.status(201).json({ success: true, data: row });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getTeamById(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.put(
  '/:id',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: updateTeamBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updateTeam(req.tenantId!, req.params.id, req.body);
    if (!row) throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    setAuditData(res, { action: 'team.update', entityType: 'team', entityId: row.team_id, afterState: row });
    res.json({ success: true, data: row });
  }),
);

router.delete(
  '/:id',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deleteTeam(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    setAuditData(res, { action: 'team.delete', entityType: 'team', entityId: req.params.id });
    res.json({ success: true, message: 'Team deleted' });
  }),
);

router.get(
  '/:id/members',
  asyncHandler(async (req: Request, res: Response) => {
    const members = await svc.listMembers(req.tenantId!, req.params.id);
    res.json({ success: true, data: members });
  }),
);

router.post(
  '/:id/members',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: addMemberBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const member = await svc.addMember(
      req.tenantId!,
      req.params.id,
      req.body.userId,
      req.body.roleInTeam || 'member',
    );
    setAuditData(res, {
      action: 'team.member.add',
      entityType: 'team_member',
      entityId: `${req.params.id}:${req.body.userId}`,
      afterState: member,
    });
    res.status(201).json({ success: true, data: member });
  }),
);

router.delete(
  '/:id/members/:userId',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.removeMember(req.tenantId!, req.params.id, req.params.userId);
    if (!ok) throw new UserServiceError('TEAM_MEMBER_NOT_FOUND', undefined, { teamId: req.params.id, userId: req.params.userId });
    setAuditData(res, {
      action: 'team.member.remove',
      entityType: 'team_member',
      entityId: `${req.params.id}:${req.params.userId}`,
    });
    res.json({ success: true, message: 'Member removed' });
  }),
);

export { router as teamsRouter };
