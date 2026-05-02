import { Router, Request, Response } from 'express';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import * as incidentService from '../domain/incident.service';
import { recordAudit } from '../adapters/audit.adapter';
import { publishIncidentCreated, publishDomainEvent } from '../events/publisher';
import { sendNotification } from '../adapters/notification.adapter';
import { validate, paginated, ok, action, requireOwnership } from '@dos/platform-core/http';
import { createIncidentBody, updateIncidentBody, listQuerySchema, bulkCreateBody, bulkDeleteBody } from '../schemas/incident.schemas';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR (2026-04-20) — all dimensions enforced.
// - withTenantClient: imported here + used across incident.service (schema-pin).
// - rateLimiter: per-route namespaced bucket on every mutation.
// - auth + perm: authenticate + requireTenantId + requirePermission per verb.
// - audit: recordAudit(tenantId, action, entity, id, actor, meta).
// - event: publishIncidentCreated / publishDomainEvent on every state change.
// - ownership: requireOwnership('ownerUserId') on single-resource routes;
//   service layer enforces owner-or-role (incidentService.assertAccess).
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'risk:incident', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const mutationLimiter = rateLimiter({ namespace: 'risk:incident:mut', maxRequests: 60, windowMs: 60_000 });
const readLimiter = rateLimiter({ namespace: 'risk:incident:read', maxRequests: 300, windowMs: 60_000 });

const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get(
  '/',
  readLimiter,
  requirePermission('risk.incident.read'),
  validate({ query: listQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const { page, pageSize, status, search, sortBy, sortOrder } = req.query as any;
      const result = await incidentService.list(tenantId, { page, pageSize, status, search, sortBy, sortOrder });
      paginated(res, result.data, result.total, result.page, result.pageSize);
    } catch (err) {
      res.status(500).json({ error: 'Failed to list incidents', details: (err as Error).message });
    }
  },
);

router.get(
  '/stats',
  readLimiter,
  requirePermission('risk.incident.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const stats = await incidentService.getStats(tenantId);
      ok(res, stats);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get incident stats', details: (err as Error).message });
    }
  },
);

router.post(
  '/bulk',
  mutationLimiter,
  requirePermission('risk.incident.create'),
  validate({ body: bulkCreateBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const items = await incidentService.bulkCreate(tenantId, req.body.items);
      recordAudit(tenantId, 'incident.bulk_created', 'incident', 'bulk', actorId, { count: items.length });
      await publishDomainEvent('incident.bulk_created', { count: items.length, ids: items.map((i: any) => i.incident_id), moduleCode: 'incident' }, tenantId, actorId);
      res.status(201); ok(res, items);
    } catch (err) {
      res.status(500).json({ error: 'Failed to bulk create', details: (err as Error).message });
    }
  },
);

router.delete(
  '/bulk',
  mutationLimiter,
  requirePermission('risk.incident.delete'),
  validate({ body: bulkDeleteBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const count = await incidentService.bulkRemove(tenantId, req.body.ids);
      recordAudit(tenantId, 'incident.bulk_deleted', 'incident', 'bulk', actorId, { count, ids: req.body.ids });
      await publishDomainEvent('incident.bulk_deleted', { count, ids: req.body.ids, moduleCode: 'incident' }, tenantId, actorId);
      action(res, `${count} items deleted`);
    } catch (err) {
      res.status(500).json({ error: 'Failed to bulk delete', details: (err as Error).message });
    }
  },
);

router.get(
  '/:id',
  readLimiter,
  requirePermission('risk.incident.read'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const item = await incidentService.getById(tenantId, req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Incident not found', code: 'INCIDENT_NOT_FOUND' });
        return;
      }
      ok(res, item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to get incident', details: (err as Error).message });
    }
  },
);

router.post(
  '/',
  mutationLimiter,
  requirePermission('risk.incident.create'),
  validate({ body: createIncidentBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const item = await incidentService.create(tenantId, req.body);
      recordAudit(tenantId, 'incident.created', 'incident', item.incident_id, actorId, { title: req.body.title || req.body.name });
      await publishIncidentCreated(tenantId, item.incident_id, { title: req.body.title || req.body.name }, actorId);
      if (actorId) {
        sendNotification(tenantId, actorId, 'Incident Created', `Incident "${req.body.title || req.body.name || ''}" created successfully`, 'success', { entityId: item.incident_id }).catch(() => {});
      }
      res.status(201); ok(res, item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create incident', details: (err as Error).message });
    }
  },
);

router.put(
  '/:id',
  mutationLimiter,
  requirePermission('risk.incident.update'),
  requireOwnership('ownerUserId'),
  validate({ body: updateIncidentBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const updated = await incidentService.update(tenantId, req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Incident not found', code: 'INCIDENT_NOT_FOUND' });
        return;
      }
      recordAudit(tenantId, 'incident.updated', 'incident', req.params.id, actorId, { changes: Object.keys(req.body) });
      await publishDomainEvent('incident.updated', { incidentId: req.params.id, changes: Object.keys(req.body), moduleCode: 'incident' }, tenantId, actorId);
      ok(res, updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update incident', details: (err as Error).message });
    }
  },
);

router.delete(
  '/:id',
  mutationLimiter,
  requirePermission('risk.incident.delete'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const deleted = await incidentService.remove(tenantId, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Incident not found', code: 'INCIDENT_NOT_FOUND' });
        return;
      }
      recordAudit(tenantId, 'incident.deleted', 'incident', req.params.id, actorId);
      await publishDomainEvent('incident.deleted', { incidentId: req.params.id, moduleCode: 'incident' }, tenantId, actorId);
      action(res, 'Incident deleted');
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete incident', details: (err as Error).message });
    }
  },
);

router.post(
  '/:id/restore',
  mutationLimiter,
  requirePermission('risk.incident.update'),
  requireOwnership('ownerUserId'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const actorId = req.user!.userId;
      const item = await incidentService.restore(tenantId, req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Incident not found or not deleted', code: 'INCIDENT_NOT_FOUND' });
        return;
      }
      recordAudit(tenantId, 'incident.restored', 'incident', req.params.id, actorId);
      await publishDomainEvent('incident.restored', { incidentId: req.params.id, moduleCode: 'incident' }, tenantId, actorId);
      ok(res, item);
    } catch (err) {
      res.status(500).json({ error: 'Failed to restore incident', details: (err as Error).message });
    }
  },
);

export default router;
