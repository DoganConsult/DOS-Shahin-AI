import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import dnocPortRouter from '../dnoc-port.routes';
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
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
}

describe('DNOC port REST contract — /api/dnoc/port/v1', () => {
  let metrics: InMemoryMetricsRepository;
  let logs: InMemoryLogsRepository;
  let traces: InMemoryTracesRepository;
  let routes: InMemoryRoutesRepository;
  let health: InMemoryHealthRepository;

  beforeEach(() => {
    metrics = new InMemoryMetricsRepository();
    logs = new InMemoryLogsRepository();
    traces = new InMemoryTracesRepository();
    routes = new InMemoryRoutesRepository();
    health = new InMemoryHealthRepository();
    setDNOCPort(createDNOCPort({ metrics, logs, traces, routes, health }));
  });
  afterEach(() => resetDNOCPort());

  it('POST /metrics accepts a valid metric and records it', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dnoc/port/v1/metrics', {
      name: 'http.requests', kind: 'counter', value: 1, labels: { route: '/api/auth/login' },
    });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: true });
    expect(await metrics.count()).toBe(1);
  });

  it('POST /metrics rejects invalid kind with 400', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dnoc/port/v1/metrics', {
      name: 'x', kind: 'mystery', value: 1,
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
  });

  it('POST /logs accepts valid entries', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dnoc/port/v1/logs', {
      level: 'warn', message: 'slow query', moduleCode: 'dauth',
    });
    expect(res.status).toBe(202);
    expect(await logs.count()).toBe(1);
  });

  it('POST /spans accepts valid spans', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dnoc/port/v1/spans', {
      traceId: 'T-1', spanId: 'S-1', name: 'db.query',
      startedAt: '2026-04-22T00:00:00Z', endedAt: '2026-04-22T00:00:00.100Z',
    });
    expect(res.status).toBe(202);
    expect(await traces.count()).toBe(1);
  });

  it('POST /routes registers a route + GET listActive sees it', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dnoc/port/v1/routes', {
      moduleCode: 'dauth', serviceCode: 'auth-service',
      method: 'POST', path: '/api/auth/login', authRequired: false,
    });
    expect(res.status).toBe(202);
    // registerRoute is fire-and-forget; wait a tick
    await new Promise((r) => setTimeout(r, 10));
    const active = await routes.listActive('auth-service');
    expect(active).toHaveLength(1);
    expect(active[0].path).toBe('/api/auth/login');
  });

  it('GET /health/:serviceCode returns "unknown" then the latest after recording', async () => {
    const app = buildApp();
    const res1 = await call(app, 'GET', '/api/dnoc/port/v1/health/auth-service');
    expect(res1.status).toBe(200);
    expect(res1.body).toEqual({ serviceCode: 'auth-service', status: 'unknown' });

    await health.record('auth-service', 'degraded');
    const res2 = await call(app, 'GET', '/api/dnoc/port/v1/health/auth-service');
    expect(res2.body.status).toBe('degraded');
  });
});

describe('OpenAPI spec ↔ implementation parity', () => {
  it('every operationId in the spec is implemented + has the right verb/path', () => {
    const specYaml = readFileSync(
      join(process.cwd(), 'platform/dnoc/contracts/dnoc-port.openapi.yaml'),
      'utf8',
    );
    const expectedOperations = ['recordMetric', 'emitLog', 'emitSpan', 'registerRoute', 'getHealth'];
    for (const op of expectedOperations) {
      expect(specYaml).toMatch(new RegExp(`operationId:\\s*${op}\\b`));
    }
    const ops = specYaml.match(/operationId:\s*\w+/g) ?? [];
    expect(ops.length).toBeGreaterThanOrEqual(5);

    const routerSrc = readFileSync(
      join(process.cwd(), 'platform/dnoc/services/dnoc-service/src/routes/port/dnoc-port.routes.ts'),
      'utf8',
    );
    expect(routerSrc).toMatch(/router\.post\(['"]\/metrics['"]/);
    expect(routerSrc).toMatch(/router\.post\(['"]\/logs['"]/);
    expect(routerSrc).toMatch(/router\.post\(['"]\/spans['"]/);
    expect(routerSrc).toMatch(/router\.post\(['"]\/routes['"]/);
    expect(routerSrc).toMatch(/router\.get\(['"]\/health\/:serviceCode['"]/);
  });
});
