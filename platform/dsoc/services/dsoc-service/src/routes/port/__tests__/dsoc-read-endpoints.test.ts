import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';

import dsocPortRouter, { wireReadRepositories } from '../dsoc-port.routes';
import {
  setDSOCPort,
  resetDSOCPort,
  createDSOCPort,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
} from '@dos/dsoc-core';

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
      } catch (err) { server.close(); reject(err); }
    });
  });
}

describe('DSOC read endpoints + alert lifecycle', () => {
  let auditLog: InMemoryAuditLogRepository;
  let alerts: InMemoryAlertsRepository;
  let posture: InMemoryPostureRepository;

  beforeEach(() => {
    auditLog = new InMemoryAuditLogRepository();
    alerts = new InMemoryAlertsRepository();
    posture = new InMemoryPostureRepository();
    setDSOCPort(createDSOCPort({ auditLog, alerts, posture }));
    wireReadRepositories({ auditLog, alerts });
  });
  afterEach(() => resetDSOCPort());

  it('GET /audit-events returns tenant events after raiseAlert records them', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dsoc/port/v1/audit-events', {
      tenantId: 't-1', category: 'authn', severity: 'info',
      actor: { type: 'user', id: 'u-1' }, action: 'login.success',
      outcome: 'success', occurredAt: '2026-04-23T00:00:00Z',
    });
    const res = await call(app, 'GET', '/api/dsoc/port/v1/audit-events?tenantId=t-1');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.events[0].action).toBe('login.success');
  });

  it('GET /audit-events 400s without tenantId', async () => {
    const app = buildApp();
    const res = await call(app, 'GET', '/api/dsoc/port/v1/audit-events');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
  });

  it('GET /alerts lists open alerts for a tenant', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dsoc/port/v1/alerts', {
      tenantId: 't-2', category: 'threat', severity: 'critical',
      actor: { type: 'user', id: 'u-2' }, action: 'session.anomaly.detected',
      outcome: 'failure', occurredAt: '2026-04-23T00:00:00Z',
    });
    const res = await call(app, 'GET', '/api/dsoc/port/v1/alerts?tenantId=t-2');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it('POST /alerts/:id/acknowledge moves an open alert to acknowledged', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dsoc/port/v1/alerts', {
      tenantId: 't-3', category: 'threat', severity: 'high',
      actor: { type: 'user', id: 'u-3' }, action: 'probe',
      outcome: 'failure', occurredAt: '2026-04-23T00:00:00Z',
    });
    const open = await call(app, 'GET', '/api/dsoc/port/v1/alerts?tenantId=t-3');
    const alertId = open.body.alerts[0].id;

    const res = await call(app, 'POST', `/api/dsoc/port/v1/alerts/${alertId}/acknowledge`, { by: 'operator' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: alertId, acknowledged: true });

    const afterAck = await call(app, 'GET', '/api/dsoc/port/v1/alerts?tenantId=t-3');
    expect(afterAck.body.count).toBe(0); // list*Open* filters it out
  });

  it('POST /alerts/:id/resolve works even after ack', async () => {
    const app = buildApp();
    await call(app, 'POST', '/api/dsoc/port/v1/alerts', {
      tenantId: 't-4', category: 'threat', severity: 'high',
      actor: { type: 'user', id: 'u-4' }, action: 'probe',
      outcome: 'failure', occurredAt: '2026-04-23T00:00:00Z',
    });
    const open = await call(app, 'GET', '/api/dsoc/port/v1/alerts?tenantId=t-4');
    const alertId = open.body.alerts[0].id;

    const res = await call(app, 'POST', `/api/dsoc/port/v1/alerts/${alertId}/resolve`, { by: 'operator' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: alertId, resolved: true });
  });

  it('POST /alerts/:id/resolve 400s on non-numeric id', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dsoc/port/v1/alerts/abc/resolve', { by: 'operator' });
    expect(res.status).toBe(400);
  });

  it('POST /alerts/:id/acknowledge 400s if body misses the `by` field', async () => {
    const app = buildApp();
    const res = await call(app, 'POST', '/api/dsoc/port/v1/alerts/1/acknowledge', {});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_request');
  });
});
