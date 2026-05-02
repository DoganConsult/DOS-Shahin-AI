/**
 * Co-located tests for DAuth security-event.service.
 * Covers: logSecurityEvent, getSecurityEvents, getRecentFailedLogins,
 *         getSecurityEventSummary.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  logSecurityEvent,
  getSecurityEvents,
  getRecentFailedLogins,
  getSecurityEventSummary,
} from './security-event.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPublish.mockResolvedValue(undefined);
});

/* ------------------------------------------------------------------ */
/*  logSecurityEvent                                                   */
/* ------------------------------------------------------------------ */
describe('logSecurityEvent', () => {
  it('inserts event and publishes on happy path', async () => {
    await logSecurityEvent('t1', 'u1', 'login_success', {
      ip: '10.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: { mfa: true },
    });

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO security_events');
    expect(params[0]).toBe('t1');
    expect(params[1]).toBe('u1');
    expect(params[2]).toBe('login_success');
    expect(params[3]).toBe('10.0.0.1');

    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.security_event', 't1',
      expect.objectContaining({ userId: 'u1', eventType: 'login_success' }),
    );
  });

  it('defaults optional fields to null when not provided', async () => {
    await logSecurityEvent('t1', 'u2', 'login_failure');

    const [, params] = mockQuery.mock.calls[0];
    expect(params[3]).toBeNull(); // ip
    expect(params[4]).toBeNull(); // userAgent
    expect(params[5]).toBe('{}'); // metadata
  });

  it('swallows query errors without throwing', async () => {
    mockQuery.mockRejectedValueOnce(new Error('db down'));

    // Should not throw because of .catch(catchHandler(EC.EVENT_BUS))
    await expect(logSecurityEvent('t1', 'u1', 'login_success')).resolves.toBeUndefined();
  });

  it('swallows publish errors without throwing', async () => {
    mockPublish.mockRejectedValueOnce(new Error('bus error'));

    await expect(logSecurityEvent('t1', 'u1', 'login_success')).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  getSecurityEvents                                                  */
/* ------------------------------------------------------------------ */
describe('getSecurityEvents', () => {
  it('returns mapped events on happy path', async () => {
    const now = new Date('2026-03-01T00:00:00Z');
    mockQuery.mockResolvedValueOnce({
      rows: [{
        event_id: 'e1', tenant_id: 't1', user_id: 'u1',
        event_type: 'login_success', ip: '10.0.0.1',
        user_agent: 'Chrome', metadata: { k: 'v' },
        created_at: now,
      }],
    });

    const events = await getSecurityEvents('t1', 'u1');

    expect(events).toHaveLength(1);
    expect(events[0].eventId).toBe('e1');
    expect(events[0].ip).toBe('10.0.0.1');
    expect(events[0].createdAt).toBe(now.toISOString());
  });

  it('returns empty array when no events found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const events = await getSecurityEvents('t1');
    expect(events).toHaveLength(0);
  });

  it('applies all filter options', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getSecurityEvents('t1', 'u1', {
      eventType: 'login_failure',
      limit: 10,
      since: '2026-01-01',
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('user_id = $2');
    expect(sql).toContain('event_type = $3');
    expect(sql).toContain('created_at >= $4');
    expect(sql).toContain('LIMIT 10');
    expect(params).toEqual(['t1', 'u1', 'login_failure', '2026-01-01']);
  });

  it('handles null ip and user_agent gracefully', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        event_id: 'e2', tenant_id: 't1', user_id: 'u1',
        event_type: 'token_refresh', ip: null, user_agent: null,
        metadata: null, created_at: null,
      }],
    });

    const events = await getSecurityEvents('t1', 'u1');

    expect(events[0].ip).toBe('');
    expect(events[0].userAgent).toBe('');
    expect(events[0].metadata).toEqual({});
    expect(events[0].createdAt).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/*  getRecentFailedLogins                                              */
/* ------------------------------------------------------------------ */
describe('getRecentFailedLogins', () => {
  it('delegates to getSecurityEvents with login_failure filter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getRecentFailedLogins('t1', '2026-01-01');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('event_type');
    expect(params).toContain('login_failure');
    expect(params).toContain('2026-01-01');
  });

  it('returns results from underlying query', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        event_id: 'e1', tenant_id: 't1', user_id: 'u1',
        event_type: 'login_failure', ip: '1.2.3.4',
        user_agent: 'Bot', metadata: {}, created_at: new Date('2026-03-01'),
      }],
    });

    const events = await getRecentFailedLogins('t1', '2026-01-01');
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('login_failure');
  });

  it('returns empty array when no failed logins', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const events = await getRecentFailedLogins('t1', '2026-01-01');
    expect(events).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  getSecurityEventSummary                                            */
/* ------------------------------------------------------------------ */
describe('getSecurityEventSummary', () => {
  it('returns grouped counts on happy path', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { event_type: 'login_success', cnt: '50' },
        { event_type: 'login_failure', cnt: '3' },
      ],
    });

    const summary = await getSecurityEventSummary('t1', '2026-01-01');

    expect(summary['login_success' as unknown]).toBe(50);
    expect(summary['login_failure' as unknown]).toBe(3);
  });

  it('returns empty object when no events in range', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const summary = await getSecurityEventSummary('t1', '2099-01-01');
    expect(Object.keys(summary)).toHaveLength(0);
  });

  it('passes tenantId and since to query', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await getSecurityEventSummary('t1', '2026-06-01');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('tenant_id = $1');
    expect(sql).toContain('created_at >= $2');
    expect(params).toEqual(['t1', '2026-06-01']);
  });
});
