

import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Router, Response } from 'express';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';

import { asyncHandler, validate, moduleStack, auditMiddleware, scopeContext, lifecycleGate } from '../ports/middleware.port';
import { ok, paginated, action } from '@dos/module-sdk';
import { WidgetBundleService } from '../services/bundle/widget-bundle.service';
import {
  createBundleBody, updateBundleBody, listBundlesQuery, statusTransitionBody,
} from '../schemas/widget.schemas';
import { idParam } from '../../../schemas/common.schemas';
import type { AuthenticatedRequest } from '@dos/types';
const router = Router();
router.use(moduleStack('widgets'));
router.use(auditMiddleware('widgets'));
router.use(scopeContext);

router.get('/',
  authenticate, requirePermission('widgets.record.read'),
  validate({ query: listBundlesQuery }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetBundleService(req.tenantId!);
    const result = await service.list(req.query as Record<string, string>);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 25;
    res.json(paginated(result.rows, result.total, page, pageSize, req));
  }),
);

router.get('/:id',
  authenticate, requirePermission('widgets.record.read'),
  validate({ params: idParam }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetBundleService(req.tenantId!);
    const bundle = await service.getById(req.params.id);
    res.json(ok(bundle, req));
  }),
);

router.post('/',
  authenticate, requirePermission('widgets.record.write'),
  validate({ body: createBundleBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetBundleService(req.tenantId!);
    const userId = req.user!.userId!;
    const bundle = await service.create(req.body, userId);
    res.status(201).json(ok(bundle, req));
  }),
);

router.put('/:id',
  authenticate, requirePermission('widgets.record.write'),
  lifecycleGate('widgets'),
  validate({ params: idParam, body: updateBundleBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetBundleService(req.tenantId!);
    const userId = req.user!.userId!;
    const bundle = await service.update(req.params.id, req.body, userId);
    res.json(ok(bundle, req));
  }),
);

router.patch('/:id/status',
  authenticate, requirePermission('widgets.record.approve'),
  validate({ params: idParam, body: statusTransitionBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetBundleService(req.tenantId!);
    const userId = req.user!.userId!;
    const bundle = await service.transitionStatus(req.params.id, req.body.status, userId);
    res.json(ok(bundle, req));
  }),
);

router.delete('/:id',
  authenticate, requirePermission('widgets.record.delete'),
  validate({ params: idParam }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetBundleService(req.tenantId!);
    const userId = req.user!.userId!;
    await service.delete(req.params.id, userId);
    res.json(action('Bundle deleted', req));
  }),
);

export default router;

