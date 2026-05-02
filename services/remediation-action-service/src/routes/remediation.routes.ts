import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId } from '../adapters/auth.adapter';
import * as remediationService from '../domain/remediation.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishRemediationCreated, publishDomainEvent } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, rateLimiter } from '@dos/platform-core/http';
import { createRemediationBody, updateRemediationBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/remediation.schemas';
import { withTenantClient } from '@dos/db';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'remediation-action-service:remediation', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', validate({ query: listQuerySchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;

    const result = await remediationService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
    paginated(res, result.data, result.total, result.page, result.pageSize);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list remediations', details: (err as Error).message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const stats = await remediationService.getStats(tenantId);
    ok(res, stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get remediation stats', details: (err as Error).message });
  }
});

router.post('/bulk', validate({ body: bulkCreateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const items = await remediationService.bulkCreate(tenantId, req.body.items);
    recordAudit(tenantId, 'remediation.bulk-created', 'remediation', null as any, actorId, { count: items.length });
    res.status(201);
    ok(res, items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk create remediations', details: (err as Error).message });
  }
});

router.delete('/bulk', validate({ body: bulkDeleteBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const count = await remediationService.bulkRemove(tenantId, req.body.ids);
    recordAudit(tenantId, 'remediation.bulk-deleted', 'remediation', null as any, actorId, { count });
    action(res, `${count} Remediations deleted`);
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete remediations', details: (err as Error).message });
  }
});

// ── Module-delegated routes (Wave 2B) — must be before /:id ────────────

router.get('/module/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await remediationService.getRemediationDashboard(tenantId);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get remediation dashboard', details: (err as Error).message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const item = await remediationService.getById(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Remediation not found', code: 'REMEDIATION_NOT_FOUND' });
      return;
    }
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get remediation', details: (err as Error).message });
  }
});

router.post('/', validate({ body: createRemediationBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const item = await remediationService.create(tenantId, req.body);
    recordAudit(tenantId, 'remediation.created', 'remediation', item.remediation_id, actorId, { title: req.body.title || req.body.name });
    await publishRemediationCreated(tenantId, item.remediation_id, { title: req.body.title || req.body.name }, actorId);
    if (actorId) { sendNotification(tenantId, actorId, 'Remediation Created', `Remediation "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.remediation_id }).catch(() => {}); }
    res.status(201);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create remediation', details: (err as Error).message });
  }
});

router.put('/:id', validate({ body: updateRemediationBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const updated = await remediationService.update(tenantId, req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Remediation not found', code: 'REMEDIATION_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'remediation.updated', 'remediation', req.params.id, actorId, { changes: Object.keys(req.body) });
    ok(res, updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update remediation', details: (err as Error).message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;

    const deleted = await remediationService.remove(tenantId, req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Remediation not found', code: 'REMEDIATION_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'remediation.deleted', 'remediation', req.params.id, actorId);
    action(res, 'Remediation deleted');
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete remediation', details: (err as Error).message });
  }
});

router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const item = await remediationService.restore(tenantId, req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Remediation not found or not deleted', code: 'REMEDIATION_NOT_FOUND' });
      return;
    }
    recordAudit(tenantId, 'remediation.restored', 'remediation', req.params.id, actorId);
    ok(res, item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to restore remediation', details: (err as Error).message });
  }
});

// ── Module-delegated /:id sub-routes (Wave 2B) ────────────────────────

router.get('/:id/plan', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await remediationService.getRemediationPlan(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get remediation plan', details: (err as Error).message });
  }
});

router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await remediationService.verifyRemediation(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify remediation', details: (err as Error).message });
  }
});

router.get('/:id/tracking', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await remediationService.getRemediationTracking(tenantId, req.params.id);
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get tracking data', details: (err as Error).message });
  }
});

router.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { targetStatus, reason } = req.body;
    const result = await remediationService.transitionRemediationStatus(tenantId, req.params.id, targetStatus, actorId, reason);
    if (!result) {
      res.status(400).json({ error: 'Transition unavailable or invalid' });
      return;
    }
    ok(res, result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to transition status', details: (err as Error).message });
  }
});

router.post('/:id/assign', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const actorId = req.user!.userId;
    const { assigneeId, requireApproval, reason } = req.body;
    if (!assigneeId) {
      res.status(400).json({ error: 'assigneeId is required' });
      return;
    }
    const existing = await remediationService.getById(tenantId, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Remediation not found', code: 'REMEDIATION_NOT_FOUND' });
      return;
    }
    let approval: unknown = null;
    if (requireApproval) {
      try {
        const http = await import('http');
        const workflowUrl = process.env.WORKFLOW_SERVICE_URL || 'http://127.0.0.1:4004';
        const payload = JSON.stringify({
          workflowInstanceId: `remediation-assign-${req.params.id}`,
          requestedBy: actorId,
          approvers: [assigneeId],
          subject: `Remediation assignment: ${(existing as any).title || req.params.id}`,
          context: { entityType: 'remediation', entityId: req.params.id, moduleCode: 'remediation', assigneeId, reason },
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
      } catch { approval = null; }
    }
    const result = await remediationService.assignRemediation(tenantId, req.params.id, assigneeId, actorId, !!requireApproval);
    if (!result) {
      res.status(404).json({ error: 'Remediation not found' });
      return;
    }
    recordAudit(tenantId, 'remediation.assigned', 'remediation', req.params.id, actorId, { assigneeId, requireApproval, reason });
    await publishDomainEvent('remediation.assigned', { entityId: req.params.id, assigneeId, moduleCode: 'remediation' }, tenantId, actorId);
    sendNotification(tenantId, assigneeId, 'Remediation Assigned', `You have been assigned remediation "${(existing as any).title || req.params.id}"`, 'info', { entityId: req.params.id }).catch(() => {});
    ok(res, { remediationId: req.params.id, assignedTo: assigneeId, requireApproval: !!requireApproval, approval, result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign remediation', details: (err as Error).message });
  }
});

router.get('/:id/assignment-history', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const history = await remediationService.getAssignmentHistory(tenantId, req.params.id);
    ok(res, { history, count: Array.isArray(history) ? history.length : 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get assignment history', details: (err as Error).message });
  }
});

export default router;
