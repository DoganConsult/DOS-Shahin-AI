/**
 * Foundation — Authority + SoD routes (G2).
 * Mounted at /api/foundation/authority and /api/foundation/sod.
 *
 * Authority endpoints:
 *   GET    /authority/kinds                    Catalog of authority kinds
 *   GET    /authority/matrix                   Whole authority matrix (per position)
 *   GET    /authority/positions/:id            Authority limits for a position
 *   POST   /authority/positions/:id            Set/update authority for a position
 *
 * SoD endpoints:
 *   GET    /sod/rules                          Active SoD rules (platform + tenant overrides)
 *   POST   /sod/check                          Pre-flight check before role/action assignment
 *   GET    /sod/violations                     Open violations (with filters)
 *   POST   /sod/violations/:id/resolve         Resolve a violation
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import * as svc from './authority-sod.service';
import { writeRateLimiter } from './middleware/rate-limiter';

const setAuthorityBody = z.object({
  authority_kind: z.string().min(1).max(64),
  monetary_limit: z.number().nonnegative().optional().nullable(),
  monetary_unit:  z.string().max(8).optional().nullable(),
  qualifications: z.array(z.string().max(64)).max(50).optional(),
  conditions:     z.record(z.unknown()).optional(),
  effective_from: z.string().optional().nullable(),
  effective_to:   z.string().optional().nullable(),
});

const sodCheckBody = z.object({
  userId:        z.string().min(1).max(255),
  proposedRoles: z.array(z.string().max(64)).max(50).optional(),
  attemptedAction: z.object({
    authority_kind: z.string().max(64),
    initiator_id:   z.string().max(255).optional(),
    amount:         z.number().optional(),
  }).optional(),
  recentDelegations: z.array(z.object({
    granted_at:     z.string(),
    authority_kind: z.string().max(64),
  })).max(100).optional(),
});

const resolveViolationBody = z.object({
  resolution: z.enum(['accepted_risk','remediated','false_positive','expired']),
  note:       z.string().max(2000).optional(),
});

const router = Router();
router.use(authenticate, requireTenantId, auditMiddleware('foundation_authority_sod'));

const READ = ['admin','foundation_admin','hr_manager','line_manager','auditor','foundation.record.read'] as const;
const WRITE = ['admin','foundation_admin'] as const;
const SOD_RESOLVE = ['admin','foundation_admin','auditor'] as const;

// ─── Authority ──────────────────────────────────────────────────────────────
router.get('/authority/kinds',
  requireAnyPermission(...READ),
  asyncHandler(async (_req: Request, res: Response) => {
    const data = await svc.listAuthorityKinds();
    res.json({ success: true, data });
  }),
);

router.get('/authority/matrix',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listAuthorityMatrix(req.tenantId!);
    res.json({ success: true, data });
  }),
);

router.get('/authority/positions/:id',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listPositionAuthority(req.tenantId!, req.params.id);
    res.json({ success: true, data });
  }),
);

router.post('/authority/positions/:id',
  writeRateLimiter,
  requireAnyPermission(...WRITE),
  validate({ body: setAuthorityBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.setPositionAuthority(req.tenantId!, {
      position_id: req.params.id,
      ...req.body,
    }, req.user!.userId);
    setAuditData(res, { entityId: req.params.id, entityType: 'position_authority', action: 'set' });
    res.json({ success: true, data: row });
  }),
);

// ─── SoD ────────────────────────────────────────────────────────────────────
router.get('/sod/rules',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listRules(req.tenantId!);
    res.json({ success: true, data });
  }),
);

router.post('/sod/check',
  requireAnyPermission(...READ),
  validate({ body: sodCheckBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await svc.check(req.tenantId!, req.body);
    res.json({ success: true, data: result });
  }),
);

router.get('/sod/violations',
  requireAnyPermission(...READ),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await svc.listViolations(req.tenantId!, {
      resolution: req.query.resolution as string | undefined,
      severity:   req.query.severity as string | undefined,
      userId:     req.query.userId as string | undefined,
    });
    res.json({ success: true, data });
  }),
);

router.post('/sod/violations/:id/resolve',
  writeRateLimiter,
  requireAnyPermission(...SOD_RESOLVE),
  validate({ body: resolveViolationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const row = await svc.resolveViolation(req.tenantId!, req.params.id, req.body.resolution, req.body.note, req.user!.userId);
    if (!row) { res.status(404).json({ success: false, error: 'not_found_or_already_resolved' }); return; }
    setAuditData(res, { entityId: req.params.id, entityType: 'sod_violation', action: `resolve:${req.body.resolution}` });
    res.json({ success: true, data: row });
  }),
);

export { router as authoritySodRouter };
