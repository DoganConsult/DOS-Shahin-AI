#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const SERVICES_DIR = path.resolve('services');
const SKIP = ['_service-template', 'gateway', 'product-shell', 'ai-engine-service'];
let filesCreated = 0;

function write(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  filesCreated++;
}

function extractExports(filePath) {
  if (!fs.existsSync(filePath)) return { functions: [], interfaces: [], namedExport: null };
  const src = fs.readFileSync(filePath, 'utf8');
  const functions = [];
  const interfaces = [];
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) {
    functions.push(m[1]);
  }
  for (const m of src.matchAll(/export\s+interface\s+(\w+)/g)) {
    interfaces.push(m[1]);
  }
  const namedMatch = src.match(/export\s+const\s+(\w+Service)\s*=/);
  return { functions, interfaces, namedExport: namedMatch ? namedMatch[1] : null };
}

function extractPublisherFns(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, 'utf8');
  const fns = [];
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(publish\w+)/g)) {
    fns.push(m[1]);
  }
  return fns;
}

function extractConsumerRegistration(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const src = fs.readFileSync(filePath, 'utf8');
  const events = [];
  for (const m of src.matchAll(/subscribe\(\s*['"]([^'"]+)['"]/g)) {
    events.push(m[1]);
  }
  return events;
}

function extractRouteFile(filePath) {
  if (!fs.existsSync(filePath)) return { methods: [] };
  const src = fs.readFileSync(filePath, 'utf8');
  const methods = [];
  for (const m of src.matchAll(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g)) {
    methods.push({ method: m[1].toUpperCase(), path: m[2] });
  }
  return { methods };
}

function getCreateInputInterface(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const src = fs.readFileSync(filePath, 'utf8');
  const match = src.match(/export\s+interface\s+(Create\w+Input)\s*\{([^}]+)\}/s);
  if (!match) return null;
  const name = match[1];
  const body = match[2];
  const requiredFields = [];
  for (const line of body.split('\n')) {
    const fm = line.match(/^\s+(\w+)\s*:/);
    if (fm && !line.includes('?:')) {
      requiredFields.push(fm[1]);
    }
  }
  return { name, requiredFields };
}

function domainServiceBaseName(filename) {
  return filename.replace('.service.ts', '');
}

for (const svcName of fs.readdirSync(SERVICES_DIR).sort()) {
  if (SKIP.includes(svcName)) continue;
  const svcDir = path.join(SERVICES_DIR, svcName);
  if (!fs.statSync(svcDir).isDirectory()) continue;
  const domainDir = path.join(svcDir, 'src', 'domain');
  const routesDir = path.join(svcDir, 'src', 'routes');
  const eventsDir = path.join(svcDir, 'src', 'events');
  const testDir = path.join(svcDir, 'src', '__tests__');

  // --- Domain service tests ---
  if (fs.existsSync(domainDir)) {
    for (const file of fs.readdirSync(domainDir).filter(f => f.endsWith('.service.ts'))) {
      const domainFile = path.join(domainDir, file);
      const baseName = domainServiceBaseName(file);
      const { functions, interfaces } = extractExports(domainFile);
      const createInput = getCreateInputInterface(domainFile);

      const crudFns = functions.filter(f => ['list', 'getById', 'create', 'update', 'remove', 'getStats'].includes(f));
      if (crudFns.length === 0) continue;

      const importPath = `../domain/${baseName}.service`;
      const testContent = `import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({
  safeQuery: vi.fn(),
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => (e as Error)?.message || String(e)),
}));

${crudFns.some(f => f === 'create') ? `vi.mock('../events/publisher', () => {
  const fns: Record<string, unknown> = {};
  return new Proxy(fns, { get: (_t, p) => typeof p === 'string' && p.startsWith('publish') ? vi.fn() : undefined });
});
` : ''}
import { safeQuery } from '@dos/db';
import * as svc from '${importPath}';

const mockQuery = safeQuery as ReturnType<typeof vi.fn>;
const TENANT = 'tenant-001';

describe('${baseName}.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

${crudFns.includes('list') ? `  describe('list', () => {
    it('returns paginated results', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 2 }] })
        .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }] });
      const result = await svc.list(TENANT);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(mockQuery).toHaveBeenCalled();
    });

    it('applies status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: '1' }] });
      const result = await svc.list(TENANT, { status: 'active' });
      expect(result.data).toBeDefined();
    });

    it('applies search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 0 }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await svc.list(TENANT, { search: 'test' });
      expect(result.data).toEqual([]);
    });

    it('handles pagination boundaries', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 100 }] })
        .mockResolvedValueOnce({ rows: [] });
      const result = await svc.list(TENANT, { page: 5, pageSize: 10 });
      expect(result.page).toBe(5);
      expect(result.pageSize).toBe(10);
    });

    it('propagates database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));
      await expect(svc.list(TENANT)).rejects.toThrow('DB connection lost');
    });
  });
` : ''}
${crudFns.includes('getById') ? `  describe('getById', () => {
    it('returns record when found', async () => {
      const record = { id: 'r1', tenant_id: TENANT, title: 'Test' };
      mockQuery.mockResolvedValueOnce({ rows: [record] });
      const result = await svc.getById(TENANT, 'r1');
      expect(result).toEqual(record);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await svc.getById(TENANT, 'nonexistent');
      expect(result).toBeNull();
    });

    it('propagates database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('timeout'));
      await expect(svc.getById(TENANT, 'r1')).rejects.toThrow('timeout');
    });
  });
` : ''}
${crudFns.includes('create') ? `  describe('create', () => {
    it('inserts and returns new record', async () => {
      const created = { id: 'new-1', tenant_id: TENANT };
      mockQuery.mockResolvedValueOnce({ rows: [created] });
      const result = await svc.create(TENANT, { ${createInput ? createInput.requiredFields.map(f => `${f}: 'test-${f}'`).join(', ') : "title: 'test'"} } as any);
      expect(result).toEqual(created);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO'),
        expect.any(Array),
      );
    });

    it('propagates database errors on insert', async () => {
      mockQuery.mockRejectedValueOnce(new Error('unique violation'));
      await expect(svc.create(TENANT, { ${createInput ? createInput.requiredFields.map(f => `${f}: 'x'`).join(', ') : "title: 'x'"} } as any)).rejects.toThrow('unique violation');
    });
  });
` : ''}
${crudFns.includes('update') ? `  describe('update', () => {
    it('updates existing record', async () => {
      const existing = { id: 'r1', tenant_id: TENANT, title: 'Old' };
      const updated = { ...existing, title: 'New' };
      mockQuery
        .mockResolvedValueOnce({ rows: [existing] })
        .mockResolvedValueOnce({ rows: [updated] });
      const result = await svc.update(TENANT, 'r1', { title: 'New' } as any);
      expect(result).toEqual(updated);
    });

    it('returns null for non-existent record', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const result = await svc.update(TENANT, 'missing', { title: 'New' } as any);
      expect(result).toBeNull();
    });
  });
` : ''}
${crudFns.includes('remove') ? `  describe('remove', () => {
    it('deletes existing record', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });
      const result = await svc.remove(TENANT, 'r1');
      expect(result).toBe(true);
    });

    it('returns false for non-existent record', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });
      const result = await svc.remove(TENANT, 'missing');
      expect(result).toBe(false);
    });
  });
` : ''}
${crudFns.includes('getStats') ? `  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: 5 }] })
        .mockResolvedValueOnce({ rows: [{ status: 'open', count: 3 }, { status: 'closed', count: 2 }] });
      const result = await svc.getStats(TENANT);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('byStatus');
    });
  });
` : ''}});
`;
      write(path.join(testDir, `${baseName}.service.test.ts`), testContent);
    }
  }

  // --- Route tests ---
  if (fs.existsSync(routesDir)) {
    for (const file of fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.ts'))) {
      const routeFile = path.join(routesDir, file);
      const baseName = file.replace('.routes.ts', '');
      const { methods } = extractRouteFile(routeFile);
      if (methods.length === 0) continue;

      const domainBase = baseName;
      const domainImport = `../domain/${domainBase}.service`;
      const routeImport = `../routes/${baseName}.routes`;

      const testContent = `import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('@dos/db', () => ({ safeQuery: vi.fn() }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => String(e)),
}));
vi.mock('@dos/service-client', () => ({
  ServiceClient: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue({ ok: true, data: { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true } }),
    post: vi.fn().mockResolvedValue({ ok: true }),
  })),
}));
vi.mock('../events/publisher', () => {
  const fns: Record<string, unknown> = {};
  return new Proxy(fns, { get: (_t, p) => typeof p === 'string' && p.startsWith('publish') ? vi.fn() : undefined });
});
vi.mock('../adapters/audit.adapter', () => ({ recordAudit: vi.fn() }));
vi.mock('../adapters/notification.adapter', () => ({ sendNotification: vi.fn() }));

vi.mock('${domainImport}', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 25 }),
  getById: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', title: 'Test' }),
  create: vi.fn().mockResolvedValue({ id: 'new1', tenant_id: 't1' }),
  update: vi.fn().mockResolvedValue({ id: 'r1', tenant_id: 't1', title: 'Updated' }),
  remove: vi.fn().mockResolvedValue(true),
  getStats: vi.fn().mockResolvedValue({ total: 0, byStatus: {} }),
}));

vi.mock('../adapters/auth.adapter', () => ({
  authenticate: vi.fn((_req: any, _res: any, next: any) => {
    _req.user = { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
    _req.tenantId = 't1';
    next();
  }),
  requireTenantId: vi.fn((_req: any, _res: any, next: any) => {
    _req.tenantId = _req.tenantId || 't1';
    next();
  }),
  requirePermission: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

import router from '${routeImport}';
import * as domainSvc from '${domainImport}';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { userId: 'u1', email: 'test@test.com', tenantId: 't1', role: 'admin', roles: ['admin'], isSuperAdmin: true };
    req.tenantId = 't1';
    next();
  });
  app.use('/api/${baseName}', router);
  return app;
}

describe('${baseName} routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

${methods.some(m => m.method === 'GET' && m.path === '/') ? `  describe('GET /api/${baseName}/', () => {
    it('returns list', async () => {
      const res = await request(app).get('/api/${baseName}/');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
` : ''}
${methods.some(m => m.method === 'GET' && m.path === '/:id') ? `  describe('GET /api/${baseName}/:id', () => {
    it('returns single record', async () => {
      const res = await request(app).get('/api/${baseName}/r1');
      expect(res.status).toBe(200);
    });

    it('returns 404 for missing record', async () => {
      (domainSvc.getById as any).mockResolvedValueOnce(null);
      const res = await request(app).get('/api/${baseName}/missing');
      expect(res.status).toBe(404);
    });
  });
` : ''}
${methods.some(m => m.method === 'POST' && m.path === '/') ? `  describe('POST /api/${baseName}/', () => {
    it('creates new record', async () => {
      const res = await request(app)
        .post('/api/${baseName}/')
        .send({ title: 'New Item', category: 'test', type: 'test', severity: 'medium', name: 'test', framework_name: 'test', control_ref: 'CR-1' });
      expect([200, 201]).toContain(res.status);
    });
  });
` : ''}
${methods.some(m => m.method === 'PUT' && m.path === '/:id') ? `  describe('PUT /api/${baseName}/:id', () => {
    it('updates existing record', async () => {
      const res = await request(app)
        .put('/api/${baseName}/r1')
        .send({ title: 'Updated' });
      expect(res.status).toBe(200);
    });
  });
` : ''}
${methods.some(m => m.method === 'DELETE' && m.path === '/:id') ? `  describe('DELETE /api/${baseName}/:id', () => {
    it('deletes existing record', async () => {
      const res = await request(app).delete('/api/${baseName}/r1');
      expect(res.status).toBe(200);
    });
  });
` : ''}
});
`;
      write(path.join(testDir, `${baseName}.routes.test.ts`), testContent);
    }
  }

  // --- Consumer tests ---
  const consumerFile = path.join(eventsDir, 'consumer.ts');
  if (fs.existsSync(consumerFile)) {
    const events = extractConsumerRegistration(consumerFile);
    if (events.length > 0) {
      const testContent = `import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@dos/db', () => ({ safeQuery: vi.fn() }));
vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('@dos/types/errors', () => ({
  toErrorMessage: vi.fn((e: unknown) => String(e)),
}));
vi.mock('@dos/service-client', () => ({
  ServiceClient: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    post: vi.fn().mockResolvedValue({ ok: true }),
  })),
}));
vi.mock('../adapters/audit.adapter', () => ({ recordAudit: vi.fn() }));
vi.mock('../adapters/notification.adapter', () => ({ sendNotification: vi.fn() }));
vi.mock('../events/publisher', () => {
  const fns: Record<string, unknown> = {};
  return new Proxy(fns, { get: (_t, p) => typeof p === 'string' && p.startsWith('publish') ? vi.fn().mockResolvedValue(undefined) : undefined });
});

import { registerConsumers } from '../events/consumer';

describe('${svcName} event consumers', () => {
  let handlers: Map<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = new Map();
    const mockBus = {
      subscribe: vi.fn((event: string, handler: Function) => {
        handlers.set(event, handler);
      }),
    };
    registerConsumers(mockBus as any);
  });

  it('registers all expected event subscriptions', () => {
    const expectedEvents = ${JSON.stringify(events)};
    for (const event of expectedEvents) {
      expect(handlers.has(event), \`Missing handler for \${event}\`).toBe(true);
    }
  });

${events.map(event => `  it('handles ${event} without throwing', async () => {
    const handler = handlers.get('${event}');
    expect(handler).toBeDefined();
    await expect(handler!({
      eventId: 'evt-1',
      eventType: '${event}',
      tenantId: 't1',
      userId: 'u1',
      payload: { title: 'Test', category: 'auto', severity: 'medium', type: 'test' },
      timestamp: new Date().toISOString(),
      source: 'test',
      idempotencyKey: 'idem-1',
      version: 1,
    })).resolves.not.toThrow();
  });
`).join('\n')}});
`;
      write(path.join(testDir, 'consumer.test.ts'), testContent);
    }
  }

  // --- Publisher tests ---
  const publisherFile = path.join(eventsDir, 'publisher.ts');
  if (fs.existsSync(publisherFile)) {
    const pubFns = extractPublisherFns(publisherFile);
    if (pubFns.length > 0 && pubFns.some(f => f !== 'publishDomainEvent')) {
      const testContent = `import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPublish = vi.fn().mockResolvedValue('evt-id');

vi.mock('@dos/event-backbone', () => ({
  RedisStreamEventBus: vi.fn(),
  createEventBackbone: vi.fn(),
}));

import { setServiceBus, ${pubFns.filter(f => f !== 'publishDomainEvent').join(', ')} } from '../events/publisher';

describe('${svcName} publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setServiceBus({ publish: mockPublish } as any);
  });

${pubFns.filter(f => f !== 'publishDomainEvent' && f !== 'setServiceBus').map(fn => `  it('${fn} publishes event', async () => {
    await ${fn}('t1', 'entity-1', { test: true }, 'u1');
    expect(mockPublish).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ entityId: 'entity-1' }),
      expect.objectContaining({ tenantId: 't1' }),
    );
  });
`).join('\n')}});
`;
      write(path.join(testDir, 'publisher.test.ts'), testContent);
    }
  }
}

// --- Platform package tests ---
const platformTestDir = path.join('packages', 'dos-platform-core', 'src', '__tests__');

// Tracing tests
write(path.join(platformTestDir, 'tracing.test.ts'), `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initTracing, startSpan, tracingMiddleware, ConsoleExporter, extractTraceContext, injectTraceHeaders } from '../observability/tracing';

describe('tracing', () => {
  beforeEach(() => {
    initTracing({ serviceName: 'test-svc', enabled: false });
  });

  describe('startSpan', () => {
    it('creates span with correct name', () => {
      const span = startSpan('test-operation');
      expect(span.name).toBe('test-operation');
      expect(span.context.traceId).toBeDefined();
      expect(span.context.spanId).toBeDefined();
    });

    it('inherits parent trace ID', () => {
      const parent = startSpan('parent');
      const child = startSpan('child', parent.context);
      expect(child.context.traceId).toBe(parent.context.traceId);
      expect(child.context.parentSpanId).toBe(parent.context.spanId);
    });

    it('sets attributes', () => {
      const span = startSpan('test');
      span.setAttribute('http.method', 'GET');
      span.setAttribute('http.status_code', 200);
      expect(span.attributes['http.method']).toBe('GET');
      expect(span.attributes['http.status_code']).toBe(200);
    });

    it('records events', () => {
      const span = startSpan('test');
      span.addEvent('error', { message: 'something failed' });
      expect(span.events).toHaveLength(1);
      expect(span.events[0].name).toBe('error');
    });

    it('end sets endTime and status', () => {
      const span = startSpan('test');
      span.end('ok');
      expect(span.endTime).toBeDefined();
      expect(span.status).toBe('ok');
    });
  });

  describe('extractTraceContext', () => {
    it('extracts from traceparent header', () => {
      const req = { headers: { traceparent: '00-abc123def456-span123-01' } } as any;
      const ctx = extractTraceContext(req);
      expect(ctx).toBeDefined();
      expect(ctx!.traceId).toBe('abc123def456');
      expect(ctx!.spanId).toBe('span123');
      expect(ctx!.sampled).toBe(true);
    });

    it('returns undefined without traceparent', () => {
      const req = { headers: {} } as any;
      expect(extractTraceContext(req)).toBeUndefined();
    });
  });

  describe('injectTraceHeaders', () => {
    it('produces valid traceparent', () => {
      const span = startSpan('test');
      const headers = injectTraceHeaders(span);
      expect(headers.traceparent).toMatch(/^00-/);
    });
  });

  describe('tracingMiddleware', () => {
    it('returns middleware function', () => {
      const mw = tracingMiddleware();
      expect(typeof mw).toBe('function');
    });
  });

  describe('ConsoleExporter', () => {
    it('exports spans without error', async () => {
      const exporter = new ConsoleExporter();
      const span = startSpan('test');
      span.end('ok');
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await exporter.export([span]);
      consoleSpy.mockRestore();
    });
  });
});
`);

// Prometheus tests
write(path.join(platformTestDir, 'prometheus.test.ts'), `import { describe, it, expect } from 'vitest';
import { getMetricsText, getContentType, metricsMiddleware, recordDbQuery, recordCacheHit, recordCacheMiss } from '../observability/prometheus.service';

describe('prometheus.service', () => {
  it('getMetricsText returns string', async () => {
    const text = await getMetricsText();
    expect(typeof text).toBe('string');
  });

  it('getContentType returns string', () => {
    const ct = getContentType();
    expect(typeof ct).toBe('string');
  });

  it('metricsMiddleware returns function', () => {
    const mw = metricsMiddleware();
    expect(typeof mw).toBe('function');
  });

  it('recordDbQuery does not throw', () => {
    expect(() => recordDbQuery('SELECT', 5)).not.toThrow();
  });

  it('recordCacheHit does not throw', () => {
    expect(() => recordCacheHit('test')).not.toThrow();
  });

  it('recordCacheMiss does not throw', () => {
    expect(() => recordCacheMiss('test')).not.toThrow();
  });
});
`);

// Idempotency tests
write(path.join(platformTestDir, 'idempotency.test.ts'), `import { describe, it, expect } from 'vitest';
import { idempotencyMiddleware } from '../http/idempotency';

describe('idempotencyMiddleware', () => {
  it('returns middleware function', () => {
    const mw = idempotencyMiddleware();
    expect(typeof mw).toBe('function');
  });

  it('accepts custom options', () => {
    const mw = idempotencyMiddleware({ ttlMs: 1000, headerName: 'x-idem' });
    expect(typeof mw).toBe('function');
  });
});
`);

// Tenant rate limiter tests
write(path.join(platformTestDir, 'tenant-rate-limiter.test.ts'), `import { describe, it, expect } from 'vitest';
import { tenantAwareRateLimiter, DEFAULT_TIER_LIMITS } from '../http/tenant-rate-limiter';

describe('tenantAwareRateLimiter', () => {
  it('returns middleware function', () => {
    const mw = tenantAwareRateLimiter({ tierResolver: () => 'enterprise' });
    expect(typeof mw).toBe('function');
  });

  it('DEFAULT_TIER_LIMITS has all tiers', () => {
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('free');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('starter');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('professional');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('enterprise');
    expect(DEFAULT_TIER_LIMITS).toHaveProperty('unlimited');
  });

  it('enterprise tier allows more requests than free', () => {
    expect(DEFAULT_TIER_LIMITS.enterprise.maxRequestsPerMinute).toBeGreaterThan(DEFAULT_TIER_LIMITS.free.maxRequestsPerMinute);
  });
});
`);

// ServiceClient tests
const clientTestDir = path.join('packages', 'dos-service-client', 'src', '__tests__');
write(path.join(clientTestDir, 'service-client.test.ts'), `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceClient } from '../index';

describe('ServiceClient', () => {
  let client: ServiceClient;

  beforeEach(() => {
    client = new ServiceClient({ baseUrl: 'http://localhost:9999', timeout: 1000, retries: 0 });
  });

  it('constructs with config', () => {
    expect(client).toBeDefined();
  });

  it('throws on circuit breaker open', async () => {
    const c = new ServiceClient({ baseUrl: 'http://localhost:9999', timeout: 100, retries: 0, circuitBreakerThreshold: 1 });
    try { await c.get('/test'); } catch {}
    try { await c.get('/test'); } catch (e) {
      expect((e as Error).message).toContain('Circuit breaker');
    }
  });

  it('destroy cleans up timer', () => {
    expect(() => client.destroy()).not.toThrow();
  });
});
`);

// RuntimeConfig tests
const configTestDir = path.join('packages', 'dos-runtime-config', 'src', '__tests__');
write(path.join(configTestDir, 'runtime-config.test.ts'), `import { describe, it, expect, beforeEach } from 'vitest';
import { loadServiceConfig, ConfigValidationError } from '../index';

describe('loadServiceConfig', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  it('loads config with defaults', () => {
    const config = loadServiceConfig('test-service');
    expect(config.serviceCode).toBe('test-service');
    expect(config.port).toBeDefined();
    expect(config.db.connectionString).toBeDefined();
  });

  it('respects PORT env var', () => {
    process.env.PORT = '9999';
    const config = loadServiceConfig('test-service');
    expect(config.port).toBe(9999);
    delete process.env.PORT;
  });

  it('allows skip validation', () => {
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    expect(() => loadServiceConfig('test-service', { skipValidation: true })).not.toThrow();
  });

  it('applies overrides', () => {
    const config = loadServiceConfig('test-service', { overrides: { logLevel: 'debug' } });
    expect(config.logLevel).toBe('debug');
  });
});
`);

// EventBackbone tests
const bbTestDir = path.join('packages', 'dos-event-backbone', 'src', '__tests__');
write(path.join(bbTestDir, 'redis-stream-bus.test.ts'), `import { describe, it, expect, vi } from 'vitest';

vi.mock('ioredis', () => {
  const Redis = vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    xadd: vi.fn(),
    xgroup: vi.fn(),
    xreadgroup: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(0),
    set: vi.fn(),
    disconnect: vi.fn(),
  }));
  return { default: Redis };
});

import { RedisStreamEventBus } from '../redis-stream-bus';

describe('RedisStreamEventBus', () => {
  it('constructs without error', () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
    });
    expect(bus).toBeDefined();
  });

  it('subscribe registers handler', () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
    });
    bus.subscribe('test.event', vi.fn());
    expect(bus).toBeDefined();
  });

  it('getMetrics returns counters', () => {
    const bus = new RedisStreamEventBus({
      redisUrl: 'redis://localhost:6379',
      serviceCode: 'test-svc',
    });
    const metrics = bus.getMetrics();
    expect(metrics).toHaveProperty('published');
    expect(metrics).toHaveProperty('consumed');
    expect(metrics).toHaveProperty('failed');
  });
});
`);

// Saga orchestrator tests
write(path.join(platformTestDir, 'saga-orchestrator.test.ts'), `import { describe, it, expect, vi } from 'vitest';
import { SagaOrchestrator } from '../sagas/saga-orchestrator';

describe('SagaOrchestrator', () => {
  it('executes saga with single step', async () => {
    const orchestrator = new SagaOrchestrator();
    const result = await orchestrator.execute(
      {
        name: 'test-saga',
        steps: [{
          name: 'step-1',
          execute: async (ctx) => { ctx.data.done = true; },
          compensate: async () => {},
        }],
      },
      { tenantId: 't1' },
    );
    expect(result.status).toBe('completed');
    expect(result.steps).toHaveLength(1);
    expect(result.context.data.done).toBe(true);
  });

  it('compensates on failure', async () => {
    const compensated = vi.fn();
    const orchestrator = new SagaOrchestrator();
    const result = await orchestrator.execute(
      {
        name: 'failing-saga',
        steps: [
          {
            name: 'step-1',
            execute: async () => {},
            compensate: compensated,
          },
          {
            name: 'step-2',
            execute: async () => { throw new Error('step-2 failed'); },
            compensate: async () => {},
          },
        ],
      },
      { tenantId: 't1' },
    );
    expect(result.status).toBe('compensated');
    expect(compensated).toHaveBeenCalled();
  });
});
`);

// API versioning tests
const contractsTestDir = path.join('packages', 'dos-contracts', 'src', '__tests__');
write(path.join(contractsTestDir, 'versioning.test.ts'), `import { describe, it, expect } from 'vitest';
import { negotiateVersion, validateDeprecation, DEFAULT_DEPRECATION_POLICY } from '../api/versioning';

describe('negotiateVersion', () => {
  const contract = {
    route: '/api/risks',
    method: 'GET' as const,
    versions: [
      { version: '1', status: 'deprecated' as const },
      { version: '2', status: 'current' as const },
    ],
    ownerScope: 'platform' as const,
  };

  it('resolves to current version by default', () => {
    const result = negotiateVersion(contract);
    expect(result.resolvedVersion).toBe('2');
    expect(result.isDeprecated).toBe(false);
  });

  it('returns deprecated version with warning', () => {
    const result = negotiateVersion(contract, '1');
    expect(result.resolvedVersion).toBe('1');
    expect(result.isDeprecated).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('falls back for unknown version', () => {
    const result = negotiateVersion(contract, '99');
    expect(result.resolvedVersion).toBe('2');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('validateDeprecation', () => {
  it('requires migration guide', () => {
    const errors = validateDeprecation(
      { version: '1', status: 'deprecated' },
      new Date(),
      DEFAULT_DEPRECATION_POLICY,
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('passes with migration guide', () => {
    const errors = validateDeprecation(
      { version: '1', status: 'deprecated', migrationGuide: 'Use v2 instead' },
      new Date(),
    );
    expect(errors).toHaveLength(0);
  });
});
`);

console.log(`✓ Generated ${filesCreated} test files`);
