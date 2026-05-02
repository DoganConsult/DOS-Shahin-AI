import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import dsocPortRouter from '../dsoc-port.routes';
import {
  setDSOCPort,
  resetDSOCPort,
  createDSOCPort,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
} from '@dos/dsoc-core';
import type { DSOCPostureSnapshot } from '@dos/ports/dsoc';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/dsoc/port/v1', dsocPortRouter);
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

describe('DSOC port REST contract — /api/dsoc/port/v1', () => {
  let auditLog: InMemoryAuditLogRepository;
  let alerts: InMemoryAlertsRepository;
  let posture: InMemoryPostureRepository;

  beforeEach(() => {
    auditLog = new InMemoryAuditLogRepository();
    alerts = new InMemoryAlertsRepository();
    posture = new InMemoryPostureRepository();
    setDSOCPort(createDSOCPort({ auditLog, alerts, posture }));
  });
  afterEach(() => resetDSOCPort());

  it('POST /audit-events accepts a valid event and returns 202', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dsoc/port/v1/audit-events', {
      tenantId: 't-1',
      category: 'authn',
      severity: 'info',
      actor: { type: 'user', id: 'u-1' },
      action: 'dauth.login.success',
      outcome: 'success',
      occurredAt: '2026-04-22T00:00:00Z',
    });
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: true });
    expect(await auditLog.countByTenant('t-1')).toBe(1);
  });

  it('POST /audit-events rejects missing required fields with 400', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dsoc/port/v1/audit-events', { tenantId: 't-1' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
    expect(res.body.details.issues.length).toBeGreaterThan(0);
  });

  it('POST /alerts writes BOTH audit_log AND alerts (raiseAlert semantics)', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dsoc/port/v1/alerts', {
      tenantId: 't-2',
      category: 'threat',
      severity: 'critical',
      actor: { type: 'user', id: 'u-2' },
      action: 'session.anomaly.detected',
      outcome: 'failure',
      occurredAt: '2026-04-22T00:01:00Z',
    });
    expect(res.status).toBe(202);
    expect(await auditLog.countByTenant('t-2')).toBe(1);
    expect(await alerts.listOpen('t-2')).toHaveLength(1);
  });

  it('GET /posture/:tenantId returns 404 with no snapshot', async () => {
    const app = buildApp();
    const res = await call(app, 'GET', '/api/dsoc/port/v1/posture/t-9');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('not_found');
  });

  it('GET /posture/:tenantId returns the latest snapshot when present', async () => {
    const snap: DSOCPostureSnapshot = {
      tenantId: 't-3',
      capturedAt: '2026-04-22T02:00:00Z',
      score: 78,
      findings: [{ code: 'NO_MFA', severity: 'medium', summary: 'MFA not enforced' }],
    };
    await posture.insert(snap);

    const app = buildApp();
    const res = await call(app, 'GET', '/api/dsoc/port/v1/posture/t-3');
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(78);
    expect(res.body.findings).toHaveLength(1);
  });
});

describe('OpenAPI spec ↔ implementation parity', () => {
  it('every operationId in the spec is implemented + has the right verb/path', () => {
    const specYaml = readFileSync(
      join(process.cwd(), 'platform/dsoc/contracts/dsoc-port.openapi.yaml'),
      'utf8',
    );
    const expectedOperations = ['recordAuditEvent', 'raiseAlert', 'getLatestPosture'];
    for (const op of expectedOperations) {
      expect(specYaml).toMatch(new RegExp(`operationId:\\s*${op}\\b`));
    }
    const ops = specYaml.match(/operationId:\s*\w+/g) ?? [];
    expect(ops.length).toBeGreaterThanOrEqual(3);

    const routerSrc = readFileSync(
      join(process.cwd(), 'platform/dsoc/services/dsoc-service/src/routes/port/dsoc-port.routes.ts'),
      'utf8',
    );
    expect(routerSrc).toMatch(/router\.post\(['"]\/audit-events['"]/);
    expect(routerSrc).toMatch(/router\.post\(['"]\/alerts['"]/);
    expect(routerSrc).toMatch(/router\.get\(['"]\/posture\/:tenantId['"]/);
  });
});
