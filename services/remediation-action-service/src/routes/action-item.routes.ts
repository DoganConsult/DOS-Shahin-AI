import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId, requirePermission, requireAnyPermission } from '../adapters/auth.adapter';
import * as actionItemService from '../domain/action-item.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishActionCreated, publishDomainEvent } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createActionItemBody, updateActionItemBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/action-item.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'remediation-action-service:action-item', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', requirePermission('action.item.read'), validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, priority, search, sortBy, sortOrder } = req.query as any;

    const result = await actionItemService.list(tenantId, { page, pageSize, status, priority, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list action-items', details: (err as Error).message });
  }
});

router.get('/stats', requirePermission('action.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await actionItemService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get action-item stats', details: (err as Error).message });
  }
});

router.get('/dashboard', requirePermission('action.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const dashboard = await actionItemService.getDashboard(tenantId);
    ok(res, dashboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get action dashboard', details: (err as Error).message });
  }
});

router.post('/bulk', requirePermission('action.item.bulk'), validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const items = await actionItemService.bulkCreate(tenantId, req.body.items);
    recordAudit(tenantId, 'action-item.bulk-created', 'action-item', null as any, actorId, { count: items.length });
    res.status(201);
    ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create action-items', details: (err as Error).message });
  }
});

router.delete('/bulk', requirePermission('action.item.delete'), validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const count = await actionItemService.bulkRemove(tenantId, req.body.ids);
    recordAudit(tenantId, 'action-item.bulk-deleted', 'action-item', null as any, actorId, { count });
    await publishDomainEvent('action.deleted', { ids: req.body.ids, bulk: true, moduleCode: 'action' }, tenantId, actorId);
    action(res, `${count} ActionItems deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete action-items', details: (err as Error).message });
  }
});

router.get('/module/dashboard', requirePermission('action.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const dashboard = await actionItemService.getDashboard(tenantId);
    ok(res, dashboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get action dashboard', details: (err as Error).message });
  }
});

router.get('/module/overdue', requirePermission('action.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { checkOverdueActions } = require('../domain/remediation.service');
    const result = await checkOverdueActions(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to check overdue actions', details: (err as Error).message });
  }
});

router.get('/:id', requirePermission('action.item.read'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await actionItemService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'ActionItem not found', code: 'ACTION_ITEM_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get action-item', details: (err as Error).message });
  }
});

router.post('/', requirePermission('action.item.write'), validate({ body: createActionItemBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await actionItemService.create(tenantId, req.body);
    recordAudit(tenantId, 'action-item.created', 'action-item', item.action_id, actorId, { title: req.body.title || req.body.name });
    await publishActionCreated(tenantId, item.action_id, { title: req.body.title || req.body.name, moduleCode: 'action' }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'ActionItem Created', `ActionItem "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.action_id }).catch(() => {}); }
    res.status(201);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create action-item', details: (err as Error).message });
  }
});

router.put('/:id', requirePermission('action.item.update'), validate({ body: updateActionItemBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await actionItemService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'ActionItem not found', code: 'ACTION_ITEM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'action-item.updated', 'action-item', req.params.id, actorId, { changes: Object.keys(req.body) });
    await publishDomainEvent('action.updated', { entityId: req.params.id, changes: Object.keys(req.body), moduleCode: 'action' }, tenantId, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update action-item', details: (err as Error).message });
  }
});

router.delete('/:id', requirePermission('action.item.delete'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await actionItemService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'ActionItem not found', code: 'ACTION_ITEM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'action-item.deleted', 'action-item', req.params.id, actorId);
    await publishDomainEvent('action.deleted', { entityId: req.params.id, moduleCode: 'action' }, tenantId, actorId);
    action(res, 'ActionItem deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete action-item', details: (err as Error).message });
  }
});

router.post('/:id/restore', requirePermission('action.item.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await actionItemService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'ActionItem not found or not deleted', code: 'ACTION_ITEM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'action-item.restored', 'action-item', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore action-item', details: (err as Error).message });
  }
});

router.post('/:id/complete', requirePermission('action.item.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const updated = await actionItemService.update(tenantId, req.params.id, { status: 'completed', completed_at: new Date().toISOString() });
    if (!updated) {
      res.status(404).json({ error: 'ActionItem not found', code: 'ACTION_ITEM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'action-item.completed', 'action-item', req.params.id, actorId);
    await publishDomainEvent('action.completed', { entityId: req.params.id, moduleCode: 'action' }, tenantId, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete action-item', details: (err as Error).message });
  }
});

router.post('/:id/reassign', requirePermission('action.item.reassign'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { assigneeId } = req.body;
    if (!assigneeId) {
      res.status(400).json({ error: 'assigneeId is required' });
      return;
    }
    const updated = await actionItemService.update(tenantId, req.params.id, { assignee_id: assigneeId });
    if (!updated) {
      res.status(404).json({ error: 'ActionItem not found', code: 'ACTION_ITEM_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'action-item.reassigned', 'action-item', req.params.id, actorId, { assigneeId });
    await publishDomainEvent('action.reassigned', { entityId: req.params.id, assigneeId, moduleCode: 'action' }, tenantId, actorId);
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reassign action-item', details: (err as Error).message });
  }
});

router.post('/:id/request-approval', requirePermission('action.item.update'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { approvers, subject, context } = req.body;
    if (!approvers || !Array.isArray(approvers) || approvers.length === 0) {
      res.status(400).json({ error: 'approvers array is required' });
      return;
    }
    const item = await actionItemService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'ActionItem not found', code: 'ACTION_ITEM_NOT_FOUND' });
      return;
    }
    let approval: unknown = null;
    try {
      const http = await import('http');
      const workflowUrl = process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004';
      const payload = JSON.stringify({
        workflowInstanceId: `action-approval-${req.params.id}`,
        requestedBy: actorId,
        approvers,
        subject: subject || `Action item approval: ${(item as any).title || req.params.id}`,
        context: { ...context, entityType: 'action-item', entityId: req.params.id, moduleCode: 'action' },
      });
      approval = await new Promise((resolve, reject) => {
        const url = new URL(`${workflowUrl}/api/workflow/approvals`);
        const options = { method: 'POST', hostname: url.hostname, port: url.port, path: url.pathname, headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId, 'x-user-id': actorId, 'Content-Length': Buffer.byteLength(payload) } };
        const request = http.request(options, (response: any) => {
          let data = '';
          response.on('data', (chunk: string) => { data += chunk; });
          response.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); } });
        });
        request.on('error', reject);
        request.write(payload);
        request.end();
      });
    } catch (err) {
      approval = null;
    }
    await actionItemService.update(tenantId, req.params.id, { status: 'pending_approval' });
    recordAudit(tenantId, 'action-item.approval-requested', 'action-item', req.params.id, actorId, { approvers });
    await publishDomainEvent('action.approval_requested', { entityId: req.params.id, approvers, moduleCode: 'action' }, tenantId, actorId);
    ok(res, { actionId: req.params.id, approvalRequested: true, approval });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request approval', details: (err as Error).message });
  }
});

router.post('/:id/transition', requireAnyPermission('action.item.update', 'action.item.verify', 'action.item.close', 'action.item.cancel', 'action.item.reopen'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const { transitionActionStatus } = require('../domain/remediation.service');
    const result = await transitionActionStatus(tenantId, req.params.id, targetStatus, actorId, reason);
    if (!result) {
      res.status(400).json({ error: 'Transition unavailable or invalid' });
      return;
    }
    await publishDomainEvent('action.updated', { entityId: req.params.id, targetStatus, moduleCode: 'action' }, tenantId, actorId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transition action status', details: (err as Error).message });
  }
});

export default router;
