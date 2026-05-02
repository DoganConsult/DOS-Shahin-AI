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
  createWorkflowComment,
  getCommentsByInstance,
  updateComment,
  deleteComment,
} from '../../services/ops/workflow-comments.service';
import { createCommentBody, updateCommentBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));
router.use(auditMiddleware('workflows'));
router.use(automationMiddleware('workflows'));

router.post(
  '/workflows/comments',
  authenticate,
  requirePermission('workflow.instance.write'),
  validate({ body: createCommentBody }),
  async (req: Request, res: Response) => {
    try {
      const comment = await createWorkflowComment(req.tenantId!, {
        ...req.body,
        commenterId: req.userId!,
      });
      setAuditData(res as any, { action: 'create', entityType: 'workflow_comment', entityId: comment.comment_id });
      res.status(201).json(comment);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.get(
  '/workflows/:instanceId/comments', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('workflow.instance.read'),
  async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      const { visibility, stepId, limit, offset } = req.query;
      const result = await getCommentsByInstance(req.tenantId!, instanceId, {
        visibility: visibility as any,
        stepId: stepId as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });
      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.put(
  '/workflows/comments/:commentId',
  authenticate,
  requirePermission('workflow.instance.write'),
  validate({ body: updateCommentBody }),
  async (req: Request, res: Response) => {
    try {
      const result = await updateComment(req.tenantId!, req.params.commentId, req.userId!, req.body);
      if (!result) { res.status(404).json({ error: 'Comment not found' }); return; }
      setAuditData(res as any, { action: 'update', entityType: 'workflow_comment', entityId: req.params.commentId });
      res.json(result);
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

router.delete(
  '/workflows/comments/:commentId', validate({ body: genericPayloadSchema }), authenticate,
  requirePermission('workflow.instance.write'),
  async (req: Request, res: Response) => {
    try {
      const deleted = await deleteComment(req.tenantId!, req.params.commentId, req.userId!);
      if (!deleted) { res.status(404).json({ error: 'Comment not found' }); return; }
      setAuditData(res as any, { action: 'delete', entityType: 'workflow_comment', entityId: req.params.commentId });
      res.json({ deleted: true });
    } catch (err: unknown) {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  },
);

export default router;

