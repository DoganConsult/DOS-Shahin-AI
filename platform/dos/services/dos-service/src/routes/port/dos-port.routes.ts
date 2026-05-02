/**
 * DOS port REST surface — 1:1 with DOSPort from @dos/ports/dos.
 * Mounted at /api/dos/port/v1. Spec: platform/dos/contracts/dos-port.openapi.yaml
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getDOSPort } from '@dos/dos-core';
import type { TenantsRepository, EventsLogRepository } from '@dos/dos-core';
import type { ModuleDescriptor } from '@dos/ports/dos';

const router = Router();

// Bootstrap-time wire for the lifecycle + query endpoints.
let tenantsRepo: TenantsRepository | null = null;
let eventsRepo: EventsLogRepository | null = null;

export function wireLifecycleRepositories(deps: {
  tenants: TenantsRepository;
  events: EventsLogRepository;
}): void {
  tenantsRepo = deps.tenants;
  eventsRepo = deps.events;
}

const envelopeSchema = z.object({
  eventId: z.string().optional(),
  eventType: z.string().min(1),
  tenantId: z.string().min(1),
  occurredAt: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  correlationId: z.string().optional(),
});

const moduleDescriptorSchema = z.object({
  moduleCode: z.string().min(1),
  version: z.string().min(1),
  layer: z.enum(['platform', 'product']),
  ownerTeam: z.string().min(1),
});

function badRequest(res: Response, err: z.ZodError): Response {
  return res.status(400).json({
    code: 'invalid_request',
    message: 'Request body failed schema validation.',
    details: { issues: err.issues },
  });
}

router.get('/tenants/:tenantId', (req: Request, res: Response, next: NextFunction) => {
  const tenantId = String(req.params.tenantId ?? '');
  if (!tenantId) {
    return res.status(400).json({ code: 'invalid_request', message: 'tenantId required.' });
  }
  getDOSPort()
    .getTenant(tenantId)
    .then((tenant) => {
      if (!tenant) return res.status(404).json({ code: 'not_found', message: 'Tenant not found.' });
      return res.json(tenant);
    })
    .catch(next);
});

router.post('/events', (req: Request, res: Response, next: NextFunction) => {
  const parsed = envelopeSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDOSPort()
    .publishEvent(parsed.data as any)
    .then(() => res.status(202).json({ accepted: true }))
    .catch(next);
});

router.post('/modules', (req: Request, res: Response) => {
  const parsed = moduleDescriptorSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  getDOSPort().registerModule(parsed.data as ModuleDescriptor);
  res.status(202).json({ accepted: true });
});

router.get('/modules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // listModules isn't on the port contract — we fetch via the core
    // repo indirectly. For now we use the port's underlying registry
    // by relying on a simple list endpoint backed by the service's
    // own query adapter. The handler below delegates to the internal
    // /modules endpoint via a thin SQL query route helper that the
    // bootstrap injects.
    const list = await (router as any)._dosModulesList?.(String(req.query.layer ?? '') || undefined);
    if (!list) {
      return res.status(501).json({ code: 'not_wired', message: 'Module listing not wired. Bootstrap must set router._dosModulesList.' });
    }
    return res.json({ count: list.length, modules: list });
  } catch (err) {
    return next(err);
  }
});

router.get('/modules/:moduleCode/registered', (req: Request, res: Response) => {
  const moduleCode = String(req.params.moduleCode ?? '');
  const registered = getDOSPort().isModuleRegistered(moduleCode);
  res.json({ moduleCode, registered });
});

router.get('/products', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await getDOSPort().listProducts();
    return res.json({ count: products.length, products });
  } catch (err) {
    return next(err);
  }
});

// ── Tenant lifecycle ──────────────────────────────────────────
// register / suspend / decommission + events query.

const registerTenantSchema = z.object({
  tenantId: z.string().min(1),
  productCode: z.string().optional(),
  displayName: z.string().optional(),
});

router.post('/tenants', (req: Request, res: Response, next: NextFunction) => {
  if (!tenantsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Tenants repo not wired.' });
  }
  const parsed = registerTenantSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);
  const tenant = {
    tenantId: parsed.data.tenantId,
    productCode: parsed.data.productCode,
    status: 'active' as const,
  };
  tenantsRepo
    .upsert(tenant)
    .then(() =>
      getDOSPort()
        .publishEvent({
          eventType: 'dos.tenant.registered',
          tenantId: parsed.data.tenantId,
          occurredAt: new Date().toISOString(),
          payload: { productCode: parsed.data.productCode, displayName: parsed.data.displayName },
        })
        .catch(() => { /* event mirror is best-effort */ }),
    )
    .then(() => res.status(201).json({ tenantId: parsed.data.tenantId, status: 'active' }))
    .catch(next);
});

router.post('/tenants/:tenantId/suspend', (req: Request, res: Response, next: NextFunction) => {
  if (!tenantsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Tenants repo not wired.' });
  }
  const tenantId = String(req.params.tenantId ?? '');
  tenantsRepo
    .setStatus(tenantId, 'suspended')
    .then((ok) => {
      if (!ok) return res.status(404).json({ code: 'not_found', message: 'Tenant not found.' });
      getDOSPort()
        .publishEvent({
          eventType: 'dos.tenant.suspended',
          tenantId,
          occurredAt: new Date().toISOString(),
          payload: { reason: (req.body && (req.body as any).reason) ?? null },
        })
        .catch(() => {});
      return res.json({ tenantId, status: 'suspended' });
    })
    .catch(next);
});

router.post('/tenants/:tenantId/decommission', (req: Request, res: Response, next: NextFunction) => {
  if (!tenantsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Tenants repo not wired.' });
  }
  const tenantId = String(req.params.tenantId ?? '');
  tenantsRepo
    .setStatus(tenantId, 'decommissioned')
    .then((ok) => {
      if (!ok) return res.status(404).json({ code: 'not_found', message: 'Tenant not found.' });
      getDOSPort()
        .publishEvent({
          eventType: 'dos.tenant.decommissioned',
          tenantId,
          occurredAt: new Date().toISOString(),
          payload: { reason: (req.body && (req.body as any).reason) ?? null },
        })
        .catch(() => {});
      return res.json({ tenantId, status: 'decommissioned' });
    })
    .catch(next);
});

router.get('/tenants/:tenantId/events', (req: Request, res: Response, next: NextFunction) => {
  if (!eventsRepo) {
    return res.status(501).json({ code: 'not_wired', message: 'Events repo not wired.' });
  }
  const tenantId = String(req.params.tenantId ?? '');
  const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 50)));
  eventsRepo
    .recent(tenantId, limit)
    .then((events) => res.json({ tenantId, count: events.length, events }))
    .catch(next);
});

/**
 * Bootstrap-time wiring for the /modules list. The DOSPort contract
 * exposes isModuleRegistered (synchronous, single module) but not an
 * async listModules; the service's bootstrap injects this concrete
 * function so the REST endpoint has a backing query.
 */
export function wireModulesList(
  fn: (layer?: string) => Promise<readonly unknown[]>,
): void {
  (router as any)._dosModulesList = fn;
}

export default router;
