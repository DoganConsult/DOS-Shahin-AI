import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createComplianceMountedRouter } from '../routes/compliance.mount';

describe('compliance mount router', () => {
  it('returns 401 when unauthenticated', async () => {
    const pool = { query: vi.fn().mockResolvedValue({}) };
    const evaluator = { evaluate: vi.fn().mockResolvedValue({ decision: 'deny' }) };

    let capturedOptions: any;
    const registerCompliance = (options: any) => {
      capturedOptions = options;
      const router = express.Router();
      router.get('/api/frameworks', async (req, res) => {
        let ctx;
        try {
          ctx = await capturedOptions.frameworksDeps.resolveContext(req);
        } catch (e) {
          res.status(401).json({ error: { code: 'no_context', message: String((e as Error).message) } });
          return;
        }
        const ok = await ctx.hasPermission('framework.record.read');
        if (!ok) {
          res.status(403).json({ error: { code: 'forbidden' } });
          return;
        }
        res.json({ data: { tenantId: ctx.tenantId, userId: ctx.userId, tenantSchema: ctx.tenantSchema } });
      });
      return { router };
    };

    const router = createComplianceMountedRouter({
      registerCompliance,
      db: { getPool: () => pool, tenantSchema: (t) => `tenant_${t}` },
      dauth: {
        optionalAuthenticate: (_req, _res, next) => next(),
        getAuthzEvaluator: () => evaluator as any,
      },
    });

    expect(router).not.toBeNull();
    const app = express();
    app.use(router!);

    const res = await request(app).get('/api/frameworks').set('x-tenant-id', 't1');
    expect(res.status).toBe(401);
  });

  it('returns 403 when permission denied', async () => {
    const pool = { query: vi.fn().mockResolvedValue({}) };
    const evaluator = { evaluate: vi.fn().mockResolvedValue({ decision: 'deny' }) };

    let capturedOptions: any;
    const registerCompliance = (options: any) => {
      capturedOptions = options;
      const router = express.Router();
      router.get('/api/frameworks', async (req, res) => {
        let ctx;
        try {
          ctx = await capturedOptions.frameworksDeps.resolveContext(req);
        } catch (e) {
          res.status(401).json({ error: { code: 'no_context', message: String((e as Error).message) } });
          return;
        }
        const ok = await ctx.hasPermission('framework.record.read');
        if (!ok) {
          res.status(403).json({ error: { code: 'forbidden' } });
          return;
        }
        res.json({ data: { tenantId: ctx.tenantId, userId: ctx.userId, tenantSchema: ctx.tenantSchema } });
      });
      return { router };
    };

    const router = createComplianceMountedRouter({
      registerCompliance,
      db: { getPool: () => pool, tenantSchema: (t) => `tenant_${t}` },
      dauth: {
        optionalAuthenticate: (req: any, _res: any, next: any) => {
          req.user = { userId: 'u1', tenantId: 't1', role: 'member', permissions: ['framework.record.read'] };
          next();
        },
        getAuthzEvaluator: () => evaluator as any,
      },
    });

    const app = express();
    app.use(router!);

    const res = await request(app).get('/api/frameworks').set('x-tenant-id', 't1');
    expect(res.status).toBe(403);
  });

  it('returns 200 when permission allowed', async () => {
    const pool = { query: vi.fn().mockResolvedValue({}) };
    const evaluator = { evaluate: vi.fn().mockResolvedValue({ decision: 'allow' }) };

    let capturedOptions: any;
    const registerCompliance = (options: any) => {
      capturedOptions = options;
      const router = express.Router();
      router.get('/api/frameworks', async (req, res) => {
        let ctx;
        try {
          ctx = await capturedOptions.frameworksDeps.resolveContext(req);
        } catch (e) {
          res.status(401).json({ error: { code: 'no_context', message: String((e as Error).message) } });
          return;
        }
        const ok = await ctx.hasPermission('framework.record.read');
        if (!ok) {
          res.status(403).json({ error: { code: 'forbidden' } });
          return;
        }
        res.json({ data: { tenantId: ctx.tenantId, userId: ctx.userId, tenantSchema: ctx.tenantSchema } });
      });
      return { router };
    };

    const router = createComplianceMountedRouter({
      registerCompliance,
      db: { getPool: () => pool, tenantSchema: (t) => `tenant_${t}` },
      dauth: {
        optionalAuthenticate: (req: any, _res: any, next: any) => {
          req.user = { userId: 'u1', tenantId: 't1', role: 'member', permissions: [] };
          next();
        },
        getAuthzEvaluator: () => evaluator as any,
      },
    });

    const app = express();
    app.use(router!);

    const res = await request(app).get('/api/frameworks').set('x-tenant-id', 't1');
    expect(res.status).toBe(200);
    expect(res.body?.data?.tenantId).toBe('t1');
    expect(res.body?.data?.userId).toBe('u1');
    expect(res.body?.data?.tenantSchema).toBe('tenant_t1');
  });

  it('writes audit rows through foundation port', async () => {
    const pool = { query: vi.fn().mockResolvedValue({}) };

    let capturedOptions: any;
    const registerCompliance = (options: any) => {
      capturedOptions = options;
      return { router: express.Router() };
    };

    const router = createComplianceMountedRouter({
      registerCompliance,
      db: { getPool: () => pool, tenantSchema: (t) => `tenant_${t}` },
      dauth: {
        optionalAuthenticate: (_req, _res, next) => next(),
        getAuthzEvaluator: () => null,
      },
    });

    expect(router).not.toBeNull();
    await capturedOptions.foundation.writeAudit({
      tenantId: 't1',
      actorId: 'u1',
      action: 'framework.create',
      resourceType: 'compliance_framework',
      resourceId: 'f1',
      module: 'compliance',
      after: { id: 'f1' },
    });

    expect(pool.query).toHaveBeenCalledTimes(1);
    const [sql] = pool.query.mock.calls[0];
    expect(String(sql)).toContain('INSERT INTO dos.audit_trail');
  });
});

