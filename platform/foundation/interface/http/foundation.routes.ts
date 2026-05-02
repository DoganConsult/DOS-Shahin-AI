import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { asyncHandler, auditMiddleware, validate, moduleStack, scopeContext } from '../../ports/middleware.port';
import { foundationNodeCreateBody, foundationNodeUpdateBody, foundationListQuery } from '../../schemas/foundation.schemas';
import { idParam } from '../../schemas/common.schemas';
import * as ctrl from './controllers/foundation.controller';

const router = Router();
router.use(moduleStack('foundation'));
router.use(auditMiddleware('foundation'));
router.use(scopeContext);

router.get('/', authenticate, requirePermission('foundation.record.read'),
  validate({ query: foundationListQuery }),
  asyncHandler(ctrl.listNodes));

router.get('/tree', authenticate, requirePermission('foundation.record.read'),
  asyncHandler(ctrl.getTree));

router.get('/:id', authenticate, requirePermission('foundation.record.read'),
  validate({ params: idParam }),
  asyncHandler(ctrl.getById));

router.get('/:id/children', authenticate, requirePermission('foundation.record.read'),
  validate({ params: idParam }),
  asyncHandler(ctrl.getChildNodes));

router.post('/', authenticate, requirePermission('foundation.record.write'),
  validate({ body: foundationNodeCreateBody }),
  asyncHandler(ctrl.create));

router.patch('/:id', authenticate, requirePermission('foundation.record.write'),
  validate({ params: idParam, body: foundationNodeUpdateBody }),
  asyncHandler(ctrl.update));

router.post('/:id/transition', authenticate, requirePermission('foundation.record.approve'),
  validate({ params: idParam }),
  asyncHandler(ctrl.transitionStatus));

router.delete('/:id', authenticate, requirePermission('foundation.record.delete'),
  validate({ params: idParam }),
  asyncHandler(ctrl.remove));

export default router;
