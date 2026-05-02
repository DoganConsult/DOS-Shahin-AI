import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';

import dnocPortRouter, { wireReadRepositories } from '../dnoc-port.routes';
import {
  setDNOCPort,
  resetDNOCPort,
  createDNOCPort,
  InMemoryMetricsRepository,
  InMemoryLogsRepository,
  InMemoryTracesRepository,
  InMemoryRoutesRepository,
  InMemoryHealthRepository,
} from '@dos/dnoc-core';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dnoc/port/v1', dnocPortRouter);
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

describe('DNOC read endpoints', () => {
  let metrics: InMemoryMetricsRepository;
  let traces: InMemoryTracesRepository;
  let routes: InMemoryRoutesRepository;

  beforeEach(() => {
    metrics = new InMemoryMetricsRepository();
    traces = new InMemoryTracesRepository();
    routes = new InMemoryRoutesRepository();
    setDNOCPort(
      createDNOCPort({
        metrics, logs: new InMemoryLogsRepository(),
        traces, routes, health: new InMemoryHealthRepository(),
      }),
    );
    wireReadRepositories({ metrics, traces, routes });
  });
  afterEach(() => resetDNOCPort());

  it('GET /metrics returns samples for a named metric', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dnoc/port/v1/metrics', {
      name: 'http.requests', kind: 'counter', value: 1, labels: { route: '/x' },
    });
    await call(app, 'POST', '/api/dnoc/port/v1/metrics', {
      name: 'http.requests', kind: 'counter', value: 2,
    });
    const res = await call(app, 'GET', '/api/dnoc/port/v1/metrics?name=http.requests&limit=10');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.name).toBe('http.requests');
  });

  it('GET /metrics 400s without name', async () => {
    const app = buildApp();
    const res = await call(app, 'GET', '/api/dnoc/port/v1/metrics');
    expect(res.status).toBe(400);
  });

  it('GET /traces/:traceId returns spans for that trace', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dnoc/port/v1/spans', {
      traceId: 'T-1', spanId: 'S-1', name: 'db.query',
      startedAt: '2026-04-23T00:00:00.000Z', endedAt: '2026-04-23T00:00:00.100Z',
    });
    const res = await call(app, 'GET', '/api/dnoc/port/v1/traces/T-1');
    expect(res.status).toBe(200);
    expect(res.body.spanCount).toBe(1);
  });

  it('GET /routes lists active routes for a service', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dnoc/port/v1/routes', {
      moduleCode: 'dauth', serviceCode: 'auth-service',
      method: 'POST', path: '/api/auth/login', authRequired: false,
    });
    await new Promise((r) => setTimeout(r, 10));
    const res = await call(app, 'GET', '/api/dnoc/port/v1/routes?serviceCode=auth-service');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it('GET /routes 400s without serviceCode', async () => {
    const app = buildApp();
    const res = await call(app, 'GET', '/api/dnoc/port/v1/routes');
    expect(res.status).toBe(400);
  });
});
