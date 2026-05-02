import { describe, expect, it } from 'vitest';
import {
  buildDSOCAgentTools,
  createDSOCPort,
  InMemoryAuditLogRepository,
  InMemoryAlertsRepository,
  InMemoryPostureRepository,
} from '..';

function build() {
  const auditLog = new InMemoryAuditLogRepository();
  const alerts = new InMemoryAlertsRepository();
  const posture = new InMemoryPostureRepository();
  const port = createDSOCPort({ auditLog, alerts, posture });
  const tools = buildDSOCAgentTools({ port, auditLog, alerts });
  return { port, auditLog, alerts, posture, tools };
}

describe('buildDSOCAgentTools', () => {
  it('exposes exactly three tools with unique names', () => {
    const { tools } = build();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['dsoc.get_posture', 'dsoc.list_open_alerts', 'dsoc.recent_audit_events']);
  });

  it('dsoc.recent_audit_events returns the tenant events via repo', async () => {
    const { port, tools } = build();
    await port.recordAuditEvent({
      tenantId: 't-1', category: 'authn', severity: 'info',
      actor: { type: 'user', id: 'u-1' }, action: 'dauth.login.success',
      outcome: 'success', occurredAt: '2026-04-22T00:00:00Z',
    });
    const tool = tools.find((t) => t.name === 'dsoc.recent_audit_events')!;
    const out = await tool.handler('t-1', { limit: 10 });
    expect((out as any).count).toBe(1);
    expect((out as any).events[0].action).toBe('dauth.login.success');
  });

  it('dsoc.list_open_alerts returns only at-or-above-threshold alerts', async () => {
    const { port, tools } = build();
    await port.raiseAlert({
      tenantId: 't-2', category: 'threat', severity: 'medium',
      actor: { type: 'user', id: 'u-2' }, action: 'test.medium',
      outcome: 'failure', occurredAt: '2026-04-22T00:00:00Z',
    });
    await port.raiseAlert({
      tenantId: 't-2', category: 'threat', severity: 'critical',
      actor: { type: 'user', id: 'u-2' }, action: 'test.critical',
      outcome: 'failure', occurredAt: '2026-04-22T00:00:01Z',
    });

    const tool = tools.find((t) => t.name === 'dsoc.list_open_alerts')!;
    const all = await tool.handler('t-2', {});
    expect((all as any).count).toBe(2);
    const onlyHigh = await tool.handler('t-2', { severity: 'high' });
    expect((onlyHigh as any).count).toBe(1);
    expect((onlyHigh as any).alerts[0].action).toBe('test.critical');
  });

  it('dsoc.get_posture returns a stub when no snapshot exists', async () => {
    const { tools } = build();
    const tool = tools.find((t) => t.name === 'dsoc.get_posture')!;
    const out = await tool.handler('t-3', {});
    expect((out as any).score).toBeNull();
    expect((out as any).tenantId).toBe('t-3');
  });
});
