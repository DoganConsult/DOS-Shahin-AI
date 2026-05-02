import { Router, Request, Response } from 'express';
import type { Router as ExpressRouter } from 'express';

import { authenticate, requirePermission } from '@dos/dauth-shared';
import { auditMiddleware, asyncHandler, moduleStack, validate, setAuditData } from '@dos/platform-core/http';

import {
  executeWorkflowAutomation,
  getAutomationStatus,
} from '../services/ops/workflow-automation.service';
import { triggerAutomationBody } from '../schemas/workflow-automation.schemas';

const router: ExpressRouter = Router();
router.use(moduleStack('workflow'));
router.use(auditMiddleware('compliance'));

// POST /trigger — Bootstrap default workflow templates or activate existing
router.post(
  '/trigger',
  authenticate,
  requirePermission('workflow.instance.write'),
  validate({ body: triggerAutomationBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId!;
    const result = await executeWorkflowAutomation(tenantId, userId);
    setAuditData(res, {
      action: 'execute',
      entityType: 'workflow_automation',
      entityId: result.actionId,
      afterState: result,
    });
    res.json(result);
  }),
);

// GET /status — Counts of templates and instances
router.get(
  '/status',
  authenticate,
  requirePermission('workflow.instance.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const status = await getAutomationStatus(tenantId);
    res.json(status);
  }),
);

export default router;
