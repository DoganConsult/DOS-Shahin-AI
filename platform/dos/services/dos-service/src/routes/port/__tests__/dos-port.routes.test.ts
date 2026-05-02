import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import dosPortRouter, { wireModulesList } from '../dos-port.routes';
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

describe('DOS port REST contract — /api/dos/port/v1', () => {
  let tenants: InMemoryTenantsRepository;
  let modules: InMemoryModulesRepository;
  let products: InMemoryProductsRepository;
  let events: InMemoryEventsLogRepository;

  beforeEach(() => {
    tenants = new InMemoryTenantsRepository();
    modules = new InMemoryModulesRepository();
    products = new InMemoryProductsRepository();
    events = new InMemoryEventsLogRepository();
    setDOSPort(
      createDOSPort({
        tenants, modules, products, events,
        backbonePublisher: { publish: async () => {} },
        backboneSubscriber: { subscribe: () => {} },
      }),
    );
    wireModulesList(async (layer) => {
      const all = await modules.list();
      return layer ? all.filter((m) => m.layer === layer) : all;
    });
  });
  afterEach(() => resetDOSPort());

  it('GET /tenants/:tenantId returns 404 for unknown, 200 with body for known', async () => {
    const app = buildApp();
    const miss = await call(app, 'GET', '/api/dos/port/v1/tenants/t-miss');
    expect(miss.status).toBe(404);
    expect(miss.body.code).toBe('not_found');

    await tenants.upsert({ tenantId: 't-1', productCode: 'shahin-ai', status: 'active' });
    const hit = await call(app, 'GET', '/api/dos/port/v1/tenants/t-1');
    expect(hit.status).toBe(200);
    expect(hit.body.productCode).toBe('shahin');
  });

  it('POST /events accepts a valid envelope and logs it', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dos/port/v1/events', {
      eventType: 'dos.tenant.registered',
      tenantId: 't-1',
      occurredAt: '2026-04-23T00:00:00Z',
      payload: { productCode: 'shahin-ai' },
    });
    expect(res.status).toBe(202);
    const recent = await events.recent('t-1', 10);
    expect(recent).toHaveLength(1);
  });

  it('POST /events rejects missing required fields with 400', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dos/port/v1/events', { eventType: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
  });

  it('POST /modules registers + GET /modules returns the list (filter by layer)', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dos/port/v1/modules', {
      moduleCode: 'dauth', version: '1.0.0', layer: 'platform', ownerTeam: 'platform-core',
    });
    await call(app, 'POST', '/api/dos/port/v1/modules', {
      moduleCode: 'risk', version: '1.0.0', layer: 'product', ownerTeam: 'product-shahin',
    });
    await new Promise((r) => setTimeout(r, 10));

    const all = await call(app, 'GET', '/api/dos/port/v1/modules');
    expect(all.status).toBe(200);
    expect(all.body.count).toBe(2);

    const platformOnly = await call(app, 'GET', '/api/dos/port/v1/modules?layer=platform');
    expect(platformOnly.body.count).toBe(1);
    expect(platformOnly.body.modules[0].moduleCode).toBe('dauth');
  });

  it('GET /modules/:moduleCode/registered returns the flag', async () => {
    const app = buildApp();
    const res = await call(app, 'GET', '/api/dos/port/v1/modules/dauth/registered');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ moduleCode: 'dauth', registered: true });
  });

  it('GET /products returns the registered list', async () => {
    const app = buildApp();
    await products.register({ productCode: 'shahin-ai', version: '1.0.0', enabled: true });
    const res = await call(app, 'GET', '/api/dos/port/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });
});

describe('OpenAPI spec ↔ implementation parity', () => {
  it('every operationId in the spec is implemented + matching verb/path', () => {
    const specYaml = readFileSync(
      join(process.cwd(), 'platform/dos/contracts/dos-port.openapi.yaml'),
      'utf8',
    );
    const expectedOperations = [
      'getTenant', 'publishEvent', 'registerModule',
      'listModules', 'isModuleRegistered', 'listProducts',
    ];
    for (const op of expectedOperations) {
      expect(specYaml).toMatch(new RegExp(`operationId:\\s*${op}\\b`));
    }
    const ops = specYaml.match(/operationId:\s*\w+/g) ?? [];
    expect(ops).toHaveLength(6);

    const routerSrc = readFileSync(
      join(process.cwd(), 'platform/dos/services/dos-service/src/routes/port/dos-port.routes.ts'),
      'utf8',
    );
    expect(routerSrc).toMatch(/router\.get\(['"]\/tenants\/:tenantId['"]/);
    expect(routerSrc).toMatch(/router\.post\(['"]\/events['"]/);
    expect(routerSrc).toMatch(/router\.post\(['"]\/modules['"]/);
    expect(routerSrc).toMatch(/router\.get\(['"]\/modules['"]/);
    expect(routerSrc).toMatch(/router\.get\(['"]\/modules\/:moduleCode\/registered['"]/);
    expect(routerSrc).toMatch(/router\.get\(['"]\/products['"]/);
  });
});
