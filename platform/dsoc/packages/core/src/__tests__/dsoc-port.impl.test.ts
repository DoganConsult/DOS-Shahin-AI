import { describe, expect, it } from 'vitest';
import {
  createDSOCPort,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
} from '..';
import type { DSOCAuditEvent, DSOCPostureSnapshot } from '@dos/ports/dsoc';

const sample: DSOCAuditEvent = {
  tenantId: 't-1',
  category: 'authn',
  severity: 'info',
  actor: { type: 'user', id: 'u-1' },
  action: 'dauth.login.success',
  outcome: 'success',
  occurredAt: '2026-04-22T00:00:00Z',
  attributes: { ip: '10.0.0.1' },
};

describe('createDSOCPort', () => {
  it('recordAuditEvent inserts into the audit-log repo', async () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const port = createDSOCPort({ auditLog, alerts, posture });

    await port.recordAuditEvent(sample);
    expect(await auditLog.countByTenant('t-1')).toBe(1);
  });

  it('raiseAlert inserts into BOTH audit-log and alerts repos', async () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const port = createDSOCPort({ auditLog, alerts, posture });

    await port.raiseAlert({ ...sample, severity: 'critical', category: 'threat' });
    expect(await auditLog.countByTenant('t-1')).toBe(1);
    expect(await alerts.listOpen('t-1')).toHaveLength(1);
  });

  it('getLatestPosture returns null when no snapshot exists', async () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const port = createDSOCPort({ auditLog, alerts, posture });

    expect(await port.getLatestPosture('t-1')).toBeNull();
  });

  it('getLatestPosture returns the most recently captured snapshot', async () => {
    const auditLog = new InMemoryAuditLogRepository();
    const alerts = new InMemoryAlertsRepository();
    const posture = new InMemoryPostureRepository();
    const older: DSOCPostureSnapshot = { tenantId: 't-1', capturedAt: '2026-04-22T00:00:00Z', score: 60, findings: [] };
    const newer: DSOCPostureSnapshot = { tenantId: 't-1', capturedAt: '2026-04-22T01:00:00Z', score: 80, findings: [] };
    await posture.insert(older);
    await posture.insert(newer);

    const port = createDSOCPort({ auditLog, alerts, posture });
    const latest = await port.getLatestPosture('t-1');
    expect(latest?.score).toBe(80);
  });

  it('exposes exactly the surface declared by DSOCPort', () => {
    const port = createDSOCPort({
      auditLog: new InMemoryAuditLogRepository(),
      alerts: new InMemoryAlertsRepository(),
      posture: new InMemoryPostureRepository(),
    });
    expect(Object.keys(port).sort()).toEqual([
      'getLatestPosture',
      'raiseAlert',
      'recordAuditEvent',
    ]);
  });
});
