/**
 * DSOC port REST surface — 1:1 with `DSOCPort` from `@dos/ports/dsoc`.
 * Mounted at `/api/dsoc/port/v1`.
 * Spec: platform/dsoc/contracts/dsoc-port.openapi.yaml
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDSOCPort } from '@dos/dsoc-core';
import type { DSOCAuditEvent } from '@dos/ports/dsoc';
import type { AuditLogRepository } from '@dos/dsoc-core';
import type { AlertsRepository } from '@dos/dsoc-core';

const router = Router();

// Bootstrap-time injection points for the read-side repositories.
// The service bootstrap calls wireReadRepositories() with Pg adapters;
// tests can wire InMemory adapters here.
let auditLogRepo: AuditLogRepository | null = null;
let alertsRepo: AlertsRepository | null = null;

export function wireReadRepositories(deps: {
  auditLog: AuditLogRepository;
  alerts: AlertsRepository;
}): void {
  auditLogRepo = deps.auditLog;
  alertsRepo = deps.alerts;
}

const auditEventSchema = z.object({
  tenantId: z.string().min(1),
  category: z.enum([
    'authn', 'authz', 'session', 'mfa', 'sod', 'delegation',
    'config_change', 'data_access', 'threat', 'posture',
  ]),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']),
  actor: z.object({
    type: z.enum(['user', 'service', 'agent']),
    id: z.string().min(1),
  }),
  action: z.string().min(1),
  resource: z
    .object({
      type: z.string().min(1),
      id: z.string().optional().default(''),
    })
    .optional(),
  outcome: z.enum(['success', 'failure', 'denied']),
  occurredAt: z.string().min(1),
  attributes: z.record(z.unknown()).optional(),
  correlationId: z.string().optional(),
});

function badRequest(res: Response, err: z.ZodError): Response {
  return res.status(400).json({
    code: 'invalid_request',
    message: 'Request body failed schema validation.',
    details: { issues: err.issues },
  });
}

router.post('/audit-events', (req: Request, res: Response, next: NextFunction) => {
  const parsed = auditEventSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDSOCPort()
    .recordAuditEvent(parsed.data as DSOCAuditEvent)
    .then(() => res.status(202).json({ accepted: true }))
    .catch(next);
});

router.post('/alerts', (req: Request, res: Response, next: NextFunction) => {
  const parsed = auditEventSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDSOCPort()
    .raiseAlert(parsed.data as DSOCAuditEvent)
    .then(() => res.status(202).json({ accepted: true }))
    .catch(next);
});

// ── Read endpoints ────────────────────────────────────────────
// Feed the frontend components (Alert Inbox, Event Feed).

router.get('/audit-events', (req: Request, res: Response, next: NextFunction) => {
  if (!auditLogRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Audit-log read repo not wired. Service bootstrap must call wireReadRepositories().' });
  }
  const tenantId = String(req.query.tenantId ?? '');
  if (!tenantId) {
    return res.status(400).json({ code: 'invalid_request', message: 'tenantId query param required.' });
  }
  const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 50)));
  auditLogRepo
    .recentByTenant(tenantId, limit)
    .then((events) => res.json({ tenantId, count: events.length, events }))
    .catch(next);
});

router.get('/alerts', (req: Request, res: Response, next: NextFunction) => {
  if (!alertsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Alerts read repo not wired.' });
  }
  const tenantId = String(req.query.tenantId ?? '');
  if (!tenantId) {
    return res.status(400).json({ code: 'invalid_request', message: 'tenantId query param required.' });
  }
  alertsRepo
    .listOpen(tenantId)
    .then((alerts) => res.json({ tenantId, count: alerts.length, alerts }))
    .catch(next);
});

router.post('/alerts/:id/acknowledge', (req: Request, res: Response, next: NextFunction) => {
  if (!alertsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Alerts repo not wired.' });
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ code: 'invalid_request', message: 'Alert id must be a positive integer.' });
  }
  const parsed = z.object({ by: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  alertsRepo
    .acknowledge(id, parsed.data.by)
    .then((acknowledged) => res.json({ id, acknowledged }))
    .catch(next);
});

router.get('/correlations/:correlationId', (req: Request, res: Response, next: NextFunction) => {
  if (!auditLogRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Audit-log repo not wired.' });
  }
  const correlationId = String(req.params.correlationId ?? '');
  if (!correlationId) {
    return res.status(400).json({ code: 'invalid_request', message: 'correlationId required.' });
  }
  auditLogRepo
    .byCorrelation(correlationId)
    .then((events) => res.json({ correlationId, count: events.length, events }))
    .catch(next);
});

router.post('/alerts/:id/resolve', (req: Request, res: Response, next: NextFunction) => {
  if (!alertsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Alerts repo not wired.' });
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ code: 'invalid_request', message: 'Alert id must be a positive integer.' });
  }
  const parsed = z.object({ by: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  alertsRepo
    .resolve(id, parsed.data.by)
    .then((resolved) => res.json({ id, resolved }))
    .catch(next);
});

router.get('/posture/:tenantId', (req: Request, res: Response, next: NextFunction) => {
  const tenantId = String(req.params.tenantId ?? '');
  if (!tenantId) {
    return res.status(400).json({ code: 'invalid_request', message: 'tenantId required.' });
  }
  getDSOCPort()
    .getLatestPosture(tenantId)
    .then((snapshot) => {
      if (!snapshot) {
        return res.status(404).json({ code: 'not_found', message: 'No posture snapshot for this tenant.' });
      }
      return res.json(snapshot);
    })
    .catch(next);
});

export default router;
