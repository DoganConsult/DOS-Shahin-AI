import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './governance-policies.service';
import { createPolicyBody, updatePolicyBody } from './foundation.schemas';
import { UserServiceError } from '../../contracts/user-errors';
import { writeRateLimiter } from './middleware/rate-limiter';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);
router.use(auditMiddleware('governance'));

router.get('/policies',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'governance_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt((req.query.page as string) || '1', 10);
    const pageSize = parseInt((req.query.pageSize as string) || '25', 10);
    const result = await svc.listPolicies(req.tenantId!, {
      page, pageSize, category: req.query.category as string | undefined,
    });
    res.json({ success: true, data: result.data, total: result.total, page, pageSize });
  }),
);

router.get('/policies/:id',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'governance_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.getPolicy(req.tenantId!, req.params.id);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    res.json({ success: true, data: row });
  }),
);

router.post('/policies',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'compliance_admin'),
  validate({ body: createPolicyBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.createPolicy(req.tenantId!, req.body, req.user!.userId);
    setAuditData(res, { entityId: row.policy_id, entityType: 'governance_policy', action: 'create' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.put('/policies/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'compliance_admin'),
  validate({ body: updatePolicyBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.updatePolicy(req.tenantId!, req.params.id, req.body);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'governance_policy', action: 'update' });
    res.json({ success: true, data: row });
  }),
);

// W4.F4.5 — explicit approve lifecycle (FE contract: POST /policies/:id/approve).
router.post('/policies/:id/approve',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'compliance_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.approvePolicy(req.tenantId!, req.params.id, req.user!.userId);
    if (!row) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'governance_policy', action: 'approve' });
    res.json({ success: true, data: row });
  }),
);

router.delete('/policies/:id',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'compliance_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const ok = await svc.deletePolicy(req.tenantId!, req.params.id);
    if (!ok) throw new UserServiceError('FOUNDATION_ENTITY_NOT_FOUND', undefined, { entity: 'governance_policy', id: req.params.id });
    setAuditData(res, { entityId: req.params.id, entityType: 'governance_policy', action: 'delete' });
    res.json({ success: true, message: 'Governance policy deleted' });
  }),
);

// ── PDPL consent grant — records into public.privacy_consent_log when present;
// always emits an audit row so the FE consent button is non-fake.
router.post('/pdpl/consent',
  writeRateLimiter,
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'privacy_admin', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const consentType = String((req.body?.consent_type ?? '') || '').trim();
    const granted = req.body?.granted !== false;
    if (!consentType) {
      res.status(400).json({ success: false, error: 'consent_type required' });
      return;
    }
    const userId = String(
      (req as any).user?.userId ??
      (req as any).user?.sub ??
      (req as any).user?.id ??
      req.headers['x-user-sub'] ??
      ''
    ).trim();
    if (!userId) {
      res.status(401).json({ success: false, error: 'AUTH_REQUIRED' });
      return;
    }
    const row = await svc.recordPdplConsent(req.tenantId!, userId, consentType, granted);
    setAuditData(res, { entityId: row?.id ?? `${userId}:${consentType}`, entityType: 'pdpl_consent', action: granted ? 'grant' : 'revoke' });
    res.status(201).json({ success: true, data: row });
  }),
);

router.get('/dashboard',
  requireAnyPermission('admin', 'org_admin', 'compliance_admin', 'governance_read'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json({ success: true, data: await svc.getDashboard(req.tenantId!) });
  }),
);

export { router as foundationGovernanceRouter };
