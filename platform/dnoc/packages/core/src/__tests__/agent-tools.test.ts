import { describe, expect, it } from 'vitest';
import {
  buildDNOCAgentTools,
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
  const tools = buildDNOCAgentTools({ port, metrics, logs, traces, routes });
  return { port, metrics, logs, traces, routes, health, tools };
}

describe('buildDNOCAgentTools', () => {
  it('exposes exactly four tools with unique names', () => {
    const { tools } = build();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      'dnoc.get_health',
      'dnoc.list_service_routes',
      'dnoc.recent_metrics',
      'dnoc.trace_by_id',
    ]);
  });

  it('dnoc.get_health returns unknown before any record, degraded after', async () => {
    const { tools, health } = build();
    const tool = tools.find((t) => t.name === 'dnoc.get_health')!;
    expect((await tool.handler('t', { serviceCode: 'svc' })) as any).toEqual({
      serviceCode: 'svc', status: 'unknown',
    });
    await health.record('svc', 'degraded');
    expect(((await tool.handler('t', { serviceCode: 'svc' })) as any).status).toBe('degraded');
  });

  it('dnoc.recent_metrics returns the tail of a named metric', async () => {
    const { tools, port } = build();
    port.recordMetric({ name: 'http.requests', kind: 'counter', value: 1 });
    port.recordMetric({ name: 'http.requests', kind: 'counter', value: 2 });
    port.recordMetric({ name: 'unrelated', kind: 'counter', value: 99 });
    const tool = tools.find((t) => t.name === 'dnoc.recent_metrics')!;
    const out = await tool.handler('t', { name: 'http.requests', limit: 5 });
    expect((out as any).count).toBe(2);
  });

  it('dnoc.trace_by_id returns all spans for a trace id in start-time order', async () => {
    const { tools, port } = build();
    const base = '2026-04-22T00:00:';
    port.emitSpan({
      traceId: 'T-1', spanId: 'S-1', name: 'root',
      startedAt: `${base}00.000Z`, endedAt: `${base}00.500Z`,
    });
    port.emitSpan({
      traceId: 'T-1', spanId: 'S-2', parentSpanId: 'S-1', name: 'child',
      startedAt: `${base}00.100Z`, endedAt: `${base}00.400Z`,
    });

    const tool = tools.find((t) => t.name === 'dnoc.trace_by_id')!;
    const out = await tool.handler('t', { traceId: 'T-1' });
    expect((out as any).spanCount).toBe(2);
  });

  it('dnoc.list_service_routes returns only active routes for the service', async () => {
    const { tools, port } = build();
    port.registerRoute({
      moduleCode: 'dauth', serviceCode: 'auth-service',
      method: 'POST', path: '/api/auth/login', authRequired: false,
    });
    await new Promise((r) => setTimeout(r, 10));

    const tool = tools.find((t) => t.name === 'dnoc.list_service_routes')!;
    const out = await tool.handler('t', { serviceCode: 'auth-service' });
    expect((out as any).count).toBe(1);
  });

  it('throws when required input is missing', async () => {
    const { tools } = build();
    const tool = tools.find((t) => t.name === 'dnoc.get_health')!;
    await expect(tool.handler('t', {})).rejects.toThrow(/serviceCode is required/);
  });
});
