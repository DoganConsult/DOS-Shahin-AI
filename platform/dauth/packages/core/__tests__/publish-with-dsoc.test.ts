import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@dos/platform-core/events', () => ({
  publish: vi.fn(async () => {}),
}));

import { publish as backbonePublish } from '@dos/platform-core/events';
import { publish as wrapperPublish, DAUTH_DSOC_MAP } from '../events/publish-with-dsoc';
import { setDSOCPort, resetDSOCPort } from '../audit/dsoc-port.registry';
import type { DSOCAuditEvent, DSOCPort } from '@dos/ports/dsoc';

describe('publish-with-dsoc — dual-route wrapper', () => {
  beforeEach(() => {
    resetDSOCPort();
    vi.clearAllMocks();
  });

  it('forwards every call to the backbone (legacy domain event preserved)', async () => {
    await wrapperPublish('dauth.role.assigned', 't-1', { userId: 'u-1', roleCode: 'admin' });
    expect(backbonePublish).toHaveBeenCalledWith(
      'dauth.role.assigned',
      't-1',
      { userId: 'u-1', roleCode: 'admin' },
    );
  });

  it('mirrors mapped events into DSOC port as recordAuditEvent', async () => {
    const recorded: DSOCAuditEvent[] = [];
    const alerted: DSOCAuditEvent[] = [];
    const stubPort: DSOCPort = {
      recordAuditEvent: async (e) => { recorded.push(e); },
      raiseAlert: async (e) => { alerted.push(e); },
      getLatestPosture: async () => null,
    };
    setDSOCPort(stubPort);

    await wrapperPublish('dauth.login.success', 't-1', { userId: 'u-1' });

    expect(recorded).toHaveLength(1);
    expect(alerted).toHaveLength(0);
    expect(recorded[0]).toMatchObject({
      tenantId: 't-1',
      category: 'authn',
      severity: 'info',
      action: 'dauth.login.success',
      outcome: 'success',
      actor: { type: 'user', id: 'u-1' },
    });
  });

  it('routes alert-flagged events to raiseAlert with high severity', async () => {
    const recorded: DSOCAuditEvent[] = [];
    const alerted: DSOCAuditEvent[] = [];
    setDSOCPort({
      recordAuditEvent: async (e) => { recorded.push(e); },
      raiseAlert: async (e) => { alerted.push(e); },
      getLatestPosture: async () => null,
    });

    await wrapperPublish('dauth.account.locked', 't-1', { userId: 'u-1' });

    expect(alerted).toHaveLength(1);
    expect(recorded).toHaveLength(0);
    expect(alerted[0].severity).toBe('high');
  });

  it('skips DSOC for unmapped (pure domain) events', async () => {
    const calls: string[] = [];
    setDSOCPort({
      recordAuditEvent: async () => { calls.push('audit'); },
      raiseAlert: async () => { calls.push('alert'); },
      getLatestPosture: async () => null,
    });

    await wrapperPublish('dauth.unmapped.event', 't-1', {});

    expect(calls).toEqual([]);
    expect(backbonePublish).toHaveBeenCalledOnce();
  });

  it('captures outcome=failure for *.failure events', async () => {
    const recorded: DSOCAuditEvent[] = [];
    setDSOCPort({
      recordAuditEvent: async (e) => { recorded.push(e); },
      raiseAlert: async () => {},
      getLatestPosture: async () => null,
    });

    await wrapperPublish('dauth.login.failure', 't-1', { userId: 'u-9' });

    expect(recorded).toHaveLength(1);
    expect(recorded[0].outcome).toBe('failure');
    expect(recorded[0].severity).toBe('low');
  });

  it('declares routes for every published dauth.* event the package emits', () => {
    // Smoke check: all critical authn/authz/sod events are mapped.
    const required = [
      'dauth.security_event',
      'dauth.login.success',
      'dauth.login.failure',
      'dauth.account.locked',
      'dauth.session.revoked',
      'dauth.sod.conflicts_detected',
      'dauth.role.assigned',
      'dauth.role.revoked',
      'dauth.permission.assigned',
      'dauth.permission.revoked',
      'dauth.maker_checker.submitted',
      'dauth.maker_checker.approved',
      'dauth.maker_checker.rejected',
      'dauth.access_review.created',
      'dauth.access_review.completed',
    ];
    for (const ev of required) {
      expect(DAUTH_DSOC_MAP[ev], `missing DSOC route for ${ev}`).toBeDefined();
    }
  });
});
