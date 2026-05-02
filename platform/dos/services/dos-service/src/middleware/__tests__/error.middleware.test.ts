import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { z } from 'zod';

import { dosErrorMiddleware } from '../error.middleware';
import {
  createDOSPort,
  setDOSPort,
  resetDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
} from '@dos/dos-core';

function buildApp(throwing: () => Error) {
  const app = express();
  app.use(express.json());
  app.get('/boom', (_req, _res, next) => next(throwing()));
  app.use(dosErrorMiddleware);
  return app;
}

async function call(app: express.Express, path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      const port = (server.address() as any).port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}${path}`);
        const body = await res.json().catch(() => ({}));
        server.close();
        resolve({ status: res.status, body });
      } catch (err) { server.close(); reject(err); }
    });
  });
}

describe('dosErrorMiddleware', () => {
  let events: InMemoryEventsLogRepository;

  beforeEach(() => {
    events = new InMemoryEventsLogRepository();
    setDOSPort(
      createDOSPort({
        tenants: new InMemoryTenantsRepository(),
        modules: new InMemoryModulesRepository(),
        products: new InMemoryProductsRepository(),
        events,
        backbonePublisher: { publish: async () => {} },
        backboneSubscriber: { subscribe: () => {} },
      }),
    );
  });
  afterEach(() => resetDOSPort());

  it('ZodError → 400', async () => {
    const app = buildApp(() => z.number().parse('oops') as unknown as Error);
    const res = await call(app, '/boom');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
  });

  it('AppError with explicit status → that status', async () => {
    class NotFound extends Error { status = 404; code = 'tenant_missing'; }
    const app = buildApp(() => new NotFound('nope'));
    const res = await call(app, '/boom');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('tenant_missing');
  });

  it('unknown error → 500 + self-logs a dos.service.internal_error event', async () => {
    const app = buildApp(() => new Error('self-log probe'));
    const res = await call(app, '/boom');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('internal_error');
    // Allow the fire-and-forget event to persist.
    await new Promise((r) => setTimeout(r, 10));
    const recent = await events.recent('unknown', 5);
    expect(recent.length).toBeGreaterThanOrEqual(1);
    expect(recent[0].eventType).toBe('dos.service.internal_error');
  });

  it('4xx does NOT self-log (only 5xx does)', async () => {
    class BadReq extends Error { status = 400; }
    const app = buildApp(() => new BadReq('bad'));
    await call(app, '/boom');
    await new Promise((r) => setTimeout(r, 10));
    const recent = await events.recent('unknown', 5);
    expect(recent.length).toBe(0);
  });
});
