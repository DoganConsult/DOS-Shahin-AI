import { describe, expect, it, vi } from 'vitest';
import {
  registerDSOCSubscribers,
  createDSOCPort,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
} from '..';

function buildBackboneStub() {
  const handlers = new Map<string, (event: any) => Promise<void>>();
  return {
    backbone: {
      subscribe(eventType: string, _id: string, handler: (event: any) => Promise<void>) {
        handlers.set(eventType, handler);
      },
    },
    fire: async (eventType: string, tenantId: string, payload: unknown) => {
      const h = handlers.get(eventType);
      if (!h) throw new Error(`no handler registered for ${eventType}`);
      await h({ tenantId, payload });
    },
    handlers,
  };
}

describe('registerDSOCSubscribers', () => {
  it('registers one subscriber per dsoc.audit.<category> + dsoc.alert.<severity>', () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const port = createDSOCPort({ auditLog, alerts, posture });
    const stub = buildBackboneStub();

    const n = registerDSOCSubscribers({ backbone: stub.backbone, port });
    // 10 categories + 5 severities = 15
    expect(n).toBe(15);
    expect(stub.handlers.has('dsoc.audit.authn')).toBe(true);
    expect(stub.handlers.has('dsoc.audit.threat')).toBe(true);
    expect(stub.handlers.has('dsoc.alert.critical')).toBe(true);
  });

  it('an audit-topic event flows into the audit_log via DSOCPort.recordAuditEvent', async () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const port = createDSOCPort({ auditLog, alerts, posture });
    const stub = buildBackboneStub();
    registerDSOCSubscribers({ backbone: stub.backbone, port });

    await stub.fire('dsoc.audit.authn', 't-1', {
      category: 'authn',
      severity: 'info',
      actor: { type: 'user', id: 'u-1' },
      action: 'dauth.login.success',
      outcome: 'success',
      occurredAt: '2026-04-22T00:00:00Z',
    });

    expect(await auditLog.countByTenant('t-1')).toBe(1);
    expect(await alerts.listOpen('t-1')).toHaveLength(0);
  });

  it('an alert-topic event flows into BOTH audit_log AND alerts via raiseAlert', async () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const port = createDSOCPort({ auditLog, alerts, posture });
    const stub = buildBackboneStub();
    registerDSOCSubscribers({ backbone: stub.backbone, port });

    await stub.fire('dsoc.alert.critical', 't-2', {
      category: 'threat',
      severity: 'critical',
      actor: { type: 'user', id: 'u-2' },
      action: 'session.anomaly.detected',
      outcome: 'failure',
      occurredAt: '2026-04-22T00:01:00Z',
    });

    expect(await auditLog.countByTenant('t-2')).toBe(1);
    expect(await alerts.listOpen('t-2')).toHaveLength(1);
  });

  it('falls back to safe defaults when the publisher omits optional fields', async () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const port = createDSOCPort({ auditLog, alerts, posture });
    const stub = buildBackboneStub();
    registerDSOCSubscribers({ backbone: stub.backbone, port });

    // Minimal payload — no actor, no action, no outcome.
    await stub.fire('dsoc.audit.session', 't-3', {});

    const events = await auditLog.recentByTenant('t-3', 10);
    expect(events).toHaveLength(1);
    expect(events[0].actor.type).toBe('service');
    expect(events[0].actor.id).toBe('unknown');
    expect(events[0].outcome).toBe('success');
  });
});
