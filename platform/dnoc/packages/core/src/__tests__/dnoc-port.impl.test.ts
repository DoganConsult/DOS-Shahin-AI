import { describe, expect, it } from 'vitest';
import {
  createDNOCPort,
  InMemoryMetricsRepository,
  InMemoryLogsRepository,
  InMemoryTracesRepository,
  InMemoryRoutesRepository,
  InMemoryHealthRepository,
} from '..';

function build() {
  const metrics = new InMemoryMetricsRepository();
  const logs = new InMemoryLogsRepository();
  const traces = new InMemoryTracesRepository();
  const routes = new InMemoryRoutesRepository();
  const health = new InMemoryHealthRepository();
  const port = createDNOCPort({ metrics, logs, traces, routes, health });
  return { port, metrics, logs, traces, routes, health };
}

describe('createDNOCPort', () => {
  it('recordMetric routes to the metrics repo', async () => {
    const { port, metrics } = build();
    port.recordMetric({ name: 'http.requests', kind: 'counter', value: 1, labels: { route: '/api/auth/login' } });
    port.recordMetric({ name: 'http.requests', kind: 'counter', value: 1 });
    expect(await metrics.count()).toBe(2);
    const recent = await metrics.recent('http.requests', 5);
    expect(recent).toHaveLength(2);
  });

  it('emitLog routes to the logs repo', async () => {
    const { port, logs } = build();
    port.emitLog({ level: 'warn', message: 'slow query', moduleCode: 'dauth' });
    port.emitLog({ level: 'error', message: 'boom', moduleCode: 'dsoc', tenantId: 't-1' });
    expect(await logs.count()).toBe(2);
  });

  it('emitSpan routes to the traces repo, queryable by traceId', async () => {
    const { port, traces } = build();
    const now = new Date();
    const later = new Date(now.getTime() + 100);
    port.emitSpan({
      traceId: 'T-1', spanId: 'S-1', name: 'db.query',
      startedAt: now.toISOString(), endedAt: later.toISOString(),
      attributes: { 'db.statement': 'SELECT 1' },
    });
    const spans = await traces.byTraceId('T-1');
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('db.query');
  });

  it('registerRoute persists through the routes repo + listActive reflects it', async () => {
    const { port, routes } = build();
    port.registerRoute({
      moduleCode: 'dauth', serviceCode: 'auth-service',
      method: 'POST', path: '/api/auth/login', authRequired: false,
    });
    // registerRoute is sync-fire-and-forget; wait a tick for the async write to settle
    await new Promise((r) => setTimeout(r, 0));
    const active = await routes.listActive('auth-service');
    expect(active).toHaveLength(1);
    expect(active[0].path).toBe('/api/auth/login');
  });

  it('getHealth returns "unknown" for never-seen services, and the latest status after record', async () => {
    const { port, health } = build();
    expect(await port.getHealth('mystery')).toBe('unknown');
    await health.record('auth-service', 'healthy');
    await health.record('auth-service', 'degraded');
    expect(await port.getHealth('auth-service')).toBe('degraded');
  });

  it('exposes exactly the surface declared by DNOCPort', () => {
    const { port } = build();
    expect(Object.keys(port).sort()).toEqual([
      'emitLog',
      'emitSpan',
      'getHealth',
      'recordMetric',
      'registerRoute',
    ]);
  });
});
