import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';

import dosPortRouter, { wireLifecycleRepositories } from '../dos-port.routes';
import {
  createDOSPort,
  setDOSPort,
  resetDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
} from '@dos/dos-core';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dos/port/v1', dosPortRouter);
  return app;
}

async function call(
  app: express.Express,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`, {
          method,
          headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        let parsed: any;
        try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
        server.close();
        resolve({ status: res.status, body: parsed });
      } catch (err) { server.close(); reject(err); }
    });
  });
}

describe('DOS tenant lifecycle endpoints', () => {
  let tenants: InMemoryTenantsRepository;
  let events: InMemoryEventsLogRepository;

  beforeEach(() => {
    tenants = new InMemoryTenantsRepository();
    events = new InMemoryEventsLogRepository();
    setDOSPort(
      createDOSPort({
        tenants,
        modules: new InMemoryModulesRepository(),
        products: new InMemoryProductsRepository(),
        events,
        backbonePublisher: { publish: async () => {} },
        backboneSubscriber: { subscribe: () => {} },
      }),
    );
    wireLifecycleRepositories({ tenants, events });
  });
  afterEach(() => resetDOSPort());

  it('POST /tenants registers a new tenant + publishes dos.tenant.registered', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dos/port/v1/tenants', {
      tenantId: 't-1', productCode: 'shahin-ai', displayName: 'Acme',
    });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ tenantId: 't-1', status: 'active' });

    const stored = await tenants.get('t-1');
    expect(stored).toEqual({ tenantId: 't-1', productCode: 'shahin-ai', status: 'active' });

    // Event persisted.
    const regEvents = await events.byType('dos.tenant.registered', 5);
    expect(regEvents).toHaveLength(1);
  });

  it('POST /tenants rejects missing tenantId with 400', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dos/port/v1/tenants', {});
    expect(res.status).toBe(400);
  });

  it('POST /tenants/:id/suspend moves an active tenant to suspended', async () => {
    const app = buildApp();
    await tenants.upsert({ tenantId: 't-2', status: 'active' });
    const res = await call(app, 'POST', '/api/dos/port/v1/tenants/t-2/suspend', { reason: 'billing' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tenantId: 't-2', status: 'suspended' });
    expect((await tenants.get('t-2'))!.status).toBe('suspended');

    const sus = await events.byType('dos.tenant.suspended', 5);
    expect(sus).toHaveLength(1);
    expect((sus[0].payload as any).reason).toBe('billing');
  });

  it('POST /tenants/:id/suspend 404s for unknown tenants', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dos/port/v1/tenants/t-nope/suspend', {});
    expect(res.status).toBe(404);
  });

  it('POST /tenants/:id/decommission is terminal', async () => {
    const app = buildApp();
    await tenants.upsert({ tenantId: 't-3', status: 'active' });
    const res = await call(app, 'POST', '/api/dos/port/v1/tenants/t-3/decommission', {});
    expect(res.status).toBe(200);
    expect((await tenants.get('t-3'))!.status).toBe('decommissioned');
    const dec = await events.byType('dos.tenant.decommissioned', 5);
    expect(dec).toHaveLength(1);
  });

  it('GET /tenants/:id/events returns the recent event log', async () => {
    const app = buildApp();
    await events.record({
      eventType: 'compliance.finding_raised',
      tenantId: 't-4',
      occurredAt: '2026-04-23T00:00:00Z',
      payload: { findingId: 'f-1' },
    });
    const res = await call(app, 'GET', '/api/dos/port/v1/tenants/t-4/events?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.events[0].eventType).toBe('compliance.finding_raised');
  });
});
