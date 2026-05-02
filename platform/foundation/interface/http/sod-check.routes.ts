import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './sod-check.service';
import { sodCheckBody, createSodRuleBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('sod'));

router.post('/check',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'risk_admin', 'sod_admin'),
  validate({ body: sodCheckBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const decision = await svc.checkSod(req.tenantId!, req.body.user_id, req.body.proposed_role);
    setAuditData(res, {
      entityType: 'sod_check',
      action: 'check',
      afterState: { userId: req.body.user_id, proposedRole: req.body.proposed_role, hasConflicts: decision.has_conflicts },
    });
    res.json({ success: true, data: decision });
  }),
);

router.get('/rules',
  requireAnyPermission('admin', 'compliance_admin', 'risk_admin', 'sod_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.listSodRules(req.tenantId!) });
  }),
);

router.post('/rules',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'sod_admin'),
  validate({ body: createSodRuleBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createSodRule(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.rule_id, entityType: 'sod_rule', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.delete('/rules/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'compliance_admin', 'sod_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deleteSodRule(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'sod_rule', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'sod_rule', action: 'delete' });
    res.json({ success: true, message: 'SOD rule deleted' });
  }),
);

export { router as sodCheckRouter };
