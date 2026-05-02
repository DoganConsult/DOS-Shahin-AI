import { describe, expect, it, vi } from 'vitest';
import { createBackboneDSOCPort } from '../audit/dsoc-port.publisher';
import type { DSOCAuditEvent } from '@dos/ports/dsoc';

const baseEvent: DSOCAuditEvent = {
  tenantId: 't-1',
  category: 'authn',
  severity: 'info',
  actor: { type: 'user', id: 'u-1' },
  action: 'login.success',
  outcome: 'success',
  occurredAt: '2026-04-22T00:00:00Z',
};

describe('createBackboneDSOCPort — DSOCPort over event backbone', () => {
  it('publishes audit events on dsoc.audit.<category>', async () => {
    const publish = vi.fn(async () => {});
    const port = createBackboneDSOCPort({ publish });

    await port.recordAuditEvent(baseEvent);

    expect(publish).toHaveBeenCalledOnce();
    const [topic, tenantId, payload] = publish.mock.calls[0];
    expect(topic).toBe('dsoc.audit.authn');
    expect(tenantId).toBe('t-1');
    expect(payload).toMatchObject({ action: 'login.success', outcome: 'success' });
  });

  it('publishes alerts on dsoc.alert.<severity>', async () => {
    const publish = vi.fn(async () => {});
    const port = createBackboneDSOCPort({ publish });

    await port.raiseAlert({ ...baseEvent, severity: 'critical', category: 'threat' });

    expect(publish).toHaveBeenCalledOnce();
    const [topic, tenantId] = publish.mock.calls[0];
    expect(topic).toBe('dsoc.alert.critical');
    expect(tenantId).toBe('t-1');
  });

  it('returns null for posture lookups until DSOC service exists', async () => {
    const publish = vi.fn(async () => {});
    const port = createBackboneDSOCPort({ publish });

    expect(await port.getLatestPosture('t-1')).toBeNull();
    expect(publish).not.toHaveBeenCalled();
  });
});
