/**
 * Phase 5 follow-up — Real auditMiddleware integration proof.
 *
 * The sibling user-service-tenant-isolation.test.ts stubs
 * `@dos/platform-core/http`'s auditMiddleware to sidestep Phase 2's
 * tightened `^tenant_[a-z0-9_-]{1,64}$` schema regex (short tenant
 * handles like "A"/"B" fail the guard). That stub is correct for the
 * isolation contract under test there — but it means the audit path
 * is never exercised in release-gate tests.
 *
 * This file wires a mutating route end-to-end with a REAL
 * auditMiddleware and a *valid* `tenant_<…>` tenant id, and proves:
 *   • the handler returns 200 (not a 400 HTML error page) even though
 *     the middleware is actively wrapping res.json;
 *   • tenantSchema() is invoked against the real tenant id and
 *     returns the expected schema string;
 *   • the audit INSERT is attempted against `"<tenantSchema>".audit_trail`
 *     (we don't require the table to exist — safeQuery's schema-drift
 *     catch makes the failure non-fatal, which is exactly the
 *     contract the middleware publishes).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { auditMiddleware, setAuditDbPort } from '../../packages/dos-platform-core/src/http/middleware/audit';
import { tenantSchema } from '../../packages/dos-db/src/tenant';

describe('auditMiddleware — real path with valid tenant_<…> id', () => {
  const TENANT_ID = 'abc123';
  const schema = tenantSchema(TENANT_ID);

  let auditCalls: Array<{ sql: string; params: unknown[] }>;

  beforeEach(() => {
    auditCalls = [];
    // Inject a capturing DB port so the middleware's INSERT side
    // effect is observable without touching a real Postgres.
    setAuditDbPort({
      safeQuery: async (sql: string, params?: unknown[]) => {
        auditCalls.push({ sql, params: params ?? [] });
        return { rows: [], rowCount: 0 };
      },
      tenantSchema,
    });
  });

  function mkApp() {
    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { userId: 'u-audit', role: 'admin' };
      req.tenantId = TENANT_ID;
      next();
    });
    app.use(auditMiddleware('widget'));
    app.put('/widgets/:id', (_req, res) => res.json({ ok: true, id: _req.params.id }));
    app.get('/widgets/:id', (_req, res) => res.json({ ok: true, id: _req.params.id }));
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({ error: err.message });
    });
    return app;
  }

  it('tenantSchema() derives the `tenant_<id>` schema name for a valid tenant id', () => {
    expect(schema).toBe('tenant_abc123');
  });

  it('PUT /widgets/:id returns 200 through a real auditMiddleware wrap (no 400 HTML leak)', async () => {
    const app = mkApp();
    const res = await request(app).put('/widgets/42').send({ name: 'x' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, id: '42' });
  });

  it('audit INSERT is issued against the tenant schema on mutating methods', async () => {
    const app = mkApp();
    await request(app).put('/widgets/42').send({ name: 'x' });
    // The publish is fire-and-forget inside the wrapped res.json —
    // give the microtask queue one turn to settle.
    await new Promise(r => setImmediate(r));

    expect(auditCalls.length).toBeGreaterThan(0);
    const first = auditCalls[0];
    expect(first.sql).toContain(`"${schema}".audit_trail`);
    // The params array carries [userId, action, entityType, entityId, module, path, method, ip, metadata].
    const params = first.params as string[];
    expect(params[0]).toBe('u-audit');
    expect(params[6]).toBe('PUT');
  });

  it('GET /widgets/:id bypasses the audit wrap entirely (no INSERT issued)', async () => {
    const app = mkApp();
    const res = await request(app).get('/widgets/42');
    expect(res.status).toBe(200);
    await new Promise(r => setImmediate(r));
    expect(auditCalls.length).toBe(0);
  });
});
