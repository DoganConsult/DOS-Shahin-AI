import { describe, expect, it } from 'vitest';
import {
  computePostureSnapshot,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
  createDSOCPort,
} from '..';

function build() {
  const auditLog = new InMemoryAuditLogRepository();
  const alerts = new InMemoryAlertsRepository();
  const posture = new InMemoryPostureRepository();
  const port = createDSOCPort({ auditLog, alerts, posture });
  return { auditLog, alerts, posture, port };
}

describe('computePostureSnapshot', () => {
  it('clean tenant scores 100 with no findings', async () => {
    const { auditLog, alerts, posture } = build();
    const snap = await computePostureSnapshot({ auditLog, alerts, posture }, 't-clean');
    expect(snap.score).toBe(100);
    expect(snap.findings).toEqual([]);
  });

  it('open critical alert deducts 25 (alert) + 15 (critical event in window) = 40 off', async () => {
    const { auditLog, alerts, posture, port } = build();
    // raiseAlert writes BOTH an audit_log row (critical severity) AND an alerts row.
    await port.raiseAlert({
      tenantId: 't-1', category: 'threat', severity: 'critical',
      actor: { type: 'user', id: 'u-1' }, action: 'session.anomaly',
      outcome: 'failure', occurredAt: '2026-04-23T00:00:00Z',
    });
    const snap = await computePostureSnapshot({ auditLog, alerts, posture }, 't-1');
    expect(snap.score).toBe(60);
    expect(snap.findings.map((f) => f.code)).toContain('OPEN_ALERT_CRITICAL');
    expect(snap.findings.map((f) => f.code)).toContain('CRITICAL_EVENT_PRESENT');
  });

  it('high-failure-rate (>=10 denied/failed in window) adds a medium finding', async () => {
    const { auditLog, alerts, posture, port } = build();
    for (let i = 0; i < 12; i++) {
      await port.recordAuditEvent({
        tenantId: 't-2', category: 'authn', severity: 'low',
        actor: { type: 'user', id: 'u' }, action: 'dauth.login.failure',
        outcome: 'failure', occurredAt: '2026-04-23T00:00:00Z',
      });
    }
    const snap = await computePostureSnapshot({ auditLog, alerts, posture }, 't-2');
    expect(snap.findings.map((f) => f.code)).toContain('HIGH_FAILURE_RATE');
  });

  it('clamps the score to [0, 100]', async () => {
    const { auditLog, alerts, posture, port } = build();
    // Raise 10 critical alerts (25*10 = 250 deducted → floored to 0).
    for (let i = 0; i < 10; i++) {
      await port.raiseAlert({
        tenantId: 't-3', category: 'threat', severity: 'critical',
        actor: { type: 'user', id: 'u' }, action: 'a' + i,
        outcome: 'failure', occurredAt: '2026-04-23T00:00:00Z',
      });
    }
    const snap = await computePostureSnapshot({ auditLog, alerts, posture }, 't-3');
    expect(snap.score).toBe(0);
  });

  it('persists the snapshot to the posture repo', async () => {
    const { auditLog, alerts, posture } = build();
    await computePostureSnapshot({ auditLog, alerts, posture }, 't-4');
    const latest = await posture.latest('t-4');
    expect(latest).not.toBeNull();
    expect(latest!.score).toBe(100);
  });
});
