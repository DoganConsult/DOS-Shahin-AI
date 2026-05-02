

import { Router, Response } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';

import { asyncHandler, validate, moduleStack, auditMiddleware, scopeContext, lifecycleGate } from '../ports/middleware.port';
import { ok, paginated, action } from '@dos/module-sdk';
import { WidgetRegistryService } from '../services/registry/widget-registry.service';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import {
  createWidgetBody, updateWidgetBody, listWidgetsQuery, statusTransitionBody,
} from '../schemas/widget.schemas';
import { idParam } from '../../../schemas/common.schemas';
import type { AuthenticatedRequest } from '@dos/types';
const router = Router();
router.use(moduleStack('widgets'));
router.use(auditMiddleware('widgets'));
router.use(scopeContext);

router.get('/',
  authenticate, requirePermission('widgets.record.read'),
  validate({ query: listWidgetsQuery }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRegistryService(req.tenantId!);
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
    const service = new WidgetRegistryService(req.tenantId!);
    const widget = await service.getById(req.params.id);
    res.json(ok(widget, req));
  }),
);

router.post('/',
  authenticate, requirePermission('widgets.record.write'),
  validate({ body: createWidgetBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRegistryService(req.tenantId!);
    const userId = req.user!.userId!;
    const widget = await service.create(req.body, userId);
    res.status(201).json(ok(widget, req));
  }),
);

router.put('/:id',
  authenticate, requirePermission('widgets.record.write'),
  lifecycleGate('widgets'),
  validate({ params: idParam, body: updateWidgetBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRegistryService(req.tenantId!);
    const userId = req.user!.userId!;
    const widget = await service.update(req.params.id, req.body, userId);
    res.json(ok(widget, req));
  }),
);

router.patch('/:id/status',
  authenticate, requirePermission('widgets.record.approve'),
  validate({ params: idParam, body: statusTransitionBody }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRegistryService(req.tenantId!);
    const userId = req.user!.userId!;
    const widget = await service.transitionStatus(req.params.id, req.body.status, userId);
    res.json(ok(widget, req));
  }),
);

router.delete('/:id',
  authenticate, requirePermission('widgets.record.delete'),
  validate({ params: idParam }),

  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRegistryService(req.tenantId!);
    const userId = req.user!.userId!;
    await service.delete(req.params.id, userId);
    res.json(action('Widget deleted', req));
  }),
);

export default router;

