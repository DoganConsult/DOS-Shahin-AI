import { emitEvent as _emitEvent } from './ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z as _z } from 'zod';
import { Router, Request, Response } from 'express';
import { PackInstallerService } from './pack-installer.service';
import { authenticate, requirePermission } from './ports/auth.port';
import { validate as _validate, auditMiddleware, asyncHandler, moduleStack } from './ports/middleware.port';
import { SYSTEM_JOB_ACTOR } from './ports/platform.port';

const router = Router();
const service = new PackInstallerService();

router.use(moduleStack('packs'));
router.use(auditMiddleware('packs'));

router.post(
  '/install',
  authenticate,
  requirePermission('packs.pack.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.user?.userId || req.user?.id;

    const result = await service.installPack(String(tenantId), {
      packCode: req.body?.packCode,
      appliesToRole: req.body?.appliesToRole ?? null,
      workspaceId: req.body?.workspaceId ?? null,
      installedBy: String(userId ?? SYSTEM_JOB_ACTOR),
    });

    res.json(result);
  }),
);

export default router;
