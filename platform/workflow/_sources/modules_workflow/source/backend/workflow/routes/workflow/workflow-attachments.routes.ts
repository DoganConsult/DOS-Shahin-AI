import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../ports/auth.port';
import { z as _z } from 'zod';
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  addAttachment,
  getAttachmentsByInstance,
  removeAttachment,
} from '../../services/ops/workflow-attachments.service';
import { addAttachmentBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));
router.use(auditMiddleware('workflows'));
router.use(automationMiddleware('workflows'));

router.post(
  '/workflows/attachments',
  authenticate,
  requirePermission('workflow.instance.write'),
  validate({ body: addAttachmentBody }),
  async (req: Request, res: Response) => {
    try {
      const attachment = await addAttachment(req.tenantId!, {
        ...req.body,
        uploadedBy: req.userId!,
      });
      setAuditData(res as any, { action: 'create', entityType: 'workflow_attachment', entityId: attachment.attachment_id });
      res.status(201).json(attachment);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/workflows/:instanceId/attachments', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { stepId } = req.query;
      const items = await getAttachmentsByInstance(req.tenantId!, instanceId, stepId as string);
      res.json({ items, count: items.length });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.delete(
  '/workflows/attachments/:attachmentId', validate({ body: genericPayloadSchema }), authenticate,
  requirePermission('workflow.instance.write'),
  async (req: Request, res: Response) => {
    try {
      const deleted = await removeAttachment(req.tenantId!, req.params.attachmentId, req.userId!);
      if (!deleted) { res.status(404).json({ error: 'Attachment not found' }); return; }
      setAuditData(res as any, { action: 'delete', entityType: 'workflow_attachment', entityId: req.params.attachmentId });
      res.json({ deleted: true });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

export default router;

