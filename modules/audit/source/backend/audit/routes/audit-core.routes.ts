/**
 * Audit Trail Routes — Zod-validated, DAuth-gated
 * Wires AuditService into Express router.
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, moduleStack } from '../ports/middleware.port';
import { AuditService } from '../services/audit-core.service';
import { ok, paginated } from '@dos/module-sdk';

const querySchema = z.object({
  entityType: z.string().optional(),
  entityId:   z.string().uuid().optional(),
  actorId:    z.string().uuid().optional(),
  action:     z.string().optional(),
  severity:   z.enum(['info','warning','critical']).optional(),
  from:       z.string().datetime({ offset: true }).optional(),
  to:         z.string().datetime({ offset: true }).optional(),
  limit:      z.coerce.number().int().min(1).max(500).optional(),
  offset:     z.coerce.number().int().min(0).optional(),
});

const summaryQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware('audit'));

router.get(
  '/',
  authenticate, requirePermission('audit.trail.read'),
  validate({ query: querySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const result = await AuditService.queryAuditTrail(tenantId, req.query as any);
    return res.json(paginated(result.data, result.total, req.query as any));
  }),
);

router.get(
  '/summary',
  authenticate, requirePermission('audit.trail.read'),
  validate({ query: summaryQuery }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId: string = (req as any).tenantId;
    const days = req.query.days ? Number(req.query.days) : 7;
    const result = await AuditService.getAuditSummary(tenantId, days);
    return res.json(ok(result));
  }),
);

export default router;
