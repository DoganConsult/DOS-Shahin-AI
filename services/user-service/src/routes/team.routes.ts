import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '@dos/platform-core/http';
import * as teamService from '../domain/team.service';
import * as raciService from '../domain/raci.service';
import { publishTeamMemberAdded, publishTeamMemberRemoved } from '../events/publisher';
import {
  createTeamBody,
  updateTeamBody,
  addTeamMemberBody,
  assignRaciBody,
} from '../schemas/user.schemas';
import { UserServiceError } from '../domain/contracts/user-errors';
import { writeRateLimiter } from '../middleware/rate-limiter';
import { requireAdmin } from '../middleware/ownership';

export const teamRouter = Router();

teamRouter.use(authenticate);
teamRouter.use(requireTenantId);
teamRouter.use(auditMiddleware('team'));

teamRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const page = parseInt((req.query.page as string) || '1', 10);
  const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
  const status = req.query.status as string | undefined;
  const result = await teamService.listTeams(tenantId, { page, pageSize, status });
  res.json({ success: true, data: result.data, total: result.total, page, pageSize });
}));

teamRouter.post(
  '/',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: createTeamBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { name, code, description, department_id } = req.body;
    const team = await teamService.createTeam(tenantId, {
      name, code, description, department_id, createdBy: actorId,
    });
    setAuditData(res, { action: 'team.create', entityType: 'team', entityId: team.team_id, afterState: team });
    res.status(201).json({ success: true, data: team });
  }),
);

teamRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const team = await teamService.getTeamById(req.tenantId!, req.params.id);
  if (!team) throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
  res.json({ success: true, data: team });
}));

teamRouter.put(
  '/:id',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: updateTeamBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await teamService.updateTeam(req.tenantId!, req.params.id, req.body);
    if (!updated) throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    setAuditData(res, { action: 'team.update', entityType: 'team', entityId: updated.team_id, afterState: updated });
    res.json({ success: true, data: updated });
  }),
);

teamRouter.delete(
  '/:id',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const deleted = await teamService.deleteTeam(req.tenantId!, req.params.id);
    if (!deleted) throw new UserServiceError('TEAM_NOT_FOUND', undefined, { teamId: req.params.id });
    setAuditData(res, { action: 'team.delete', entityType: 'team', entityId: req.params.id });
    res.json({ success: true, message: 'Team deleted' });
  }),
);

teamRouter.get('/:id/members', asyncHandler(async (req: Request, res: Response) => {
  const members = await teamService.listMembers(req.tenantId!, req.params.id);
  res.json({ success: true, data: members });
}));

teamRouter.post(
  '/:id/members',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: addTeamMemberBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { userId, roleInTeam } = req.body;
    const member = await teamService.addMember(tenantId, req.params.id, userId, roleInTeam || 'member');
    publishTeamMemberAdded(tenantId, req.params.id, userId, actorId);
    setAuditData(res, { action: 'team.member.add', entityType: 'team_member', entityId: `${req.params.id}:${userId}` });
    res.status(201).json({ success: true, data: member });
  }),
);

teamRouter.delete(
  '/:id/members/:userId',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const removed = await teamService.removeMember(tenantId, req.params.id, req.params.userId);
    if (!removed) throw new UserServiceError('TEAM_MEMBER_NOT_FOUND');
    publishTeamMemberRemoved(tenantId, req.params.id, req.params.userId, actorId);
    setAuditData(res, { action: 'team.member.remove', entityType: 'team_member', entityId: `${req.params.id}:${req.params.userId}` });
    res.json({ success: true, message: 'Member removed' });
  }),
);

teamRouter.get('/raci/by-user/:userId', asyncHandler(async (req: Request, res: Response) => {
  const result = await raciService.getRaciByUser(req.tenantId!, req.params.userId);
  res.json({ success: true, ...result });
}));

teamRouter.get('/:id/raci', asyncHandler(async (req: Request, res: Response) => {
  const assignments = await raciService.getRaciByTeam(req.tenantId!, req.params.id);
  res.json({ success: true, data: assignments });
}));

teamRouter.post(
  '/:id/raci',
  writeRateLimiter,
  requireAdmin(),
  validate({ body: assignRaciBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { userId, scopeType, scopeId, raciRole } = req.body;
    const assignment = await raciService.assignRaci(tenantId, {
      teamId: req.params.id,
      userId,
      scopeType,
      scopeId,
      raciRole,
      assignedBy: actorId,
    });
    setAuditData(res, { action: 'raci.assign', entityType: 'raci_assignment', entityId: assignment.id });
    res.status(201).json({ success: true, data: assignment });
  }),
);

teamRouter.delete(
  '/raci/:assignmentId',
  writeRateLimiter,
  requireAdmin(),
  asyncHandler(async (req: Request, res: Response) => {
    const revoked = await raciService.revokeRaci(req.tenantId!, req.params.assignmentId);
    if (!revoked) throw new UserServiceError('ROLE_ASSIGNMENT_NOT_FOUND', undefined, { assignmentId: req.params.assignmentId });
    setAuditData(res, { action: 'raci.revoke', entityType: 'raci_assignment', entityId: req.params.assignmentId });
    res.json({ success: true, message: 'RACI assignment revoked' });
  }),
);
