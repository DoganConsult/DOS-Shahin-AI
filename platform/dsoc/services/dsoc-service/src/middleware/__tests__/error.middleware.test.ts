import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { z } from 'zod';

import { dsocErrorMiddleware } from '../error.middleware';
import {
  setDSOCPort,
  resetDSOCPort,
  createDSOCPort,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
} from '@dos/dsoc-core';

function buildApp(throwing: () => Error) {
  const app = express();
  app.use(express.json());
  app.get('/boom', (_req, _res, next) => next(throwing()));
  app.use(dsocErrorMiddleware);
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

describe('dsocErrorMiddleware', () => {
  let auditLog: InMemoryAuditLogRepository;

  beforeEach(() => {
    auditLog = new InMemoryAuditLogRepository();
    setDSOCPort(
      createDSOCPort({
        auditLog,
        alerts: new InMemoryAlertsRepository(),
        posture: new InMemoryPostureRepository(),
      }),
    );
  });
  afterEach(() => resetDSOCPort());

  it('ZodError → 400 with issue list', async () => {
    const app = buildApp(() => z.object({ x: z.string() }).parse({}) as unknown as Error);
    const res = await call(app, '/boom');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
    expect(res.body.details.issues.length).toBeGreaterThan(0);
  });

  it('error with explicit status → that status', async () => {
    class NotFound extends Error { status = 404; code = 'tenant_not_found'; }
    const app = buildApp(() => new NotFound('tenant missing'));
    const res = await call(app, '/boom');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('tenant_not_found');
    expect(res.body.message).toBe('tenant missing');
  });

  it('unknown error → 500 with internal_error', async () => {
    const app = buildApp(() => new Error('something exploded'));
    const res = await call(app, '/boom');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('internal_error');
  });

  it('500 errors self-audit through the DSOCPort', async () => {
    const app = buildApp(() => new Error('self-audit probe'));
    await call(app, '/boom');
    // Best-effort + async; allow the promise to settle.
    await new Promise((r) => setTimeout(r, 10));
    const recent = await auditLog.recentByTenant('unknown', 5);
    expect(recent.length).toBe(1);
    expect(recent[0].category).toBe('threat');
    expect(recent[0].severity).toBe('high');
    expect(recent[0].action).toBe('dsoc.internal_error');
  });
});
