/**
 * GET /api/foundation/inheritance/:scopeType/:scopeId
 *
 * Returns the ancestor chain (and any inherited items) for an org / BU /
 * department scope. Foundation owns the chain; consumers (DAuth for SoD
 * tightening, governance for policy stacking, DOS for SLA) decide how to
 * apply the items.
 *
 * Plan: /root/.claude/plans/need-to-clean-the-swift-trinket.md (Phase B-1)
 */
import { Router, Request, Response } from 'express';
import { authenticate, requireAnyPermission, requireTenantId } from '../../infrastructure/auth.adapter';
import { asyncHandler } from '../../ports/middleware.port';
import * as svc from './inheritance.service';

const router = Router();
router.use(authenticate);
router.use(requireTenantId);

const VALID_SCOPES = new Set<svc.InheritanceScopeType>(['organization', 'business_unit', 'department']);

router.get('/:scopeType/:scopeId',
  requireAnyPermission('admin', 'org_admin', 'governance_read', 'member'),
  asyncHandler(async (req: Request, res: Response) => {
    const scopeType = req.params.scopeType as svc.InheritanceScopeType;
    if (!VALID_SCOPES.has(scopeType)) {
      res.status(400).json({
        success: false,
        error: `Invalid scopeType '${scopeType}'. Allowed: organization, business_unit, department`,
      });
      return;
    }
    res.json({
      success: true,
      data: await svc.getInheritance(req.tenantId!, scopeType, req.params.scopeId),
    });
  }),
);

export { router as inheritanceRouter };
