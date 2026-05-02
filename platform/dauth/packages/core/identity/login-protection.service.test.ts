import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: vi.fn(),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../policies/tenant-security-policy.service', () => ({
  getTenantSecurityPolicy: vi.fn().mockResolvedValue({
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
  }),
}));

import {
  recordFailedAttempt,
  recordSuccessfulLogin,
  lockAccount,
  unlockAccount,
  isAccountLocked,
  getFailedAttemptCount,
} from './login-protection.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [{ cnt: '0' }], rowCount: 0 });
  mockPublish.mockResolvedValue(undefined);
});

describe('DAuth LoginProtection — recordFailedAttempt', () => {
  it('records attempt and returns remaining count when under threshold', async () => {
    // INSERT login_attempts
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // SELECT COUNT
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '2' }] });

    const result = await recordFailedAttempt('u-001', 't-1', '1.2.3.4');
    expect(result.locked).toBe(false);
    expect(result.attemptsRemaining).toBe(3); // 5 - 2
  });

  it('locks account when max attempts reached', async () => {
    // INSERT login_attempts
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // SELECT COUNT returns 5 (at threshold)
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '5' }] });
    // UPDATE users SET status = locked (from lockAccount)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await recordFailedAttempt('u-001', 't-1', '1.2.3.4');
    expect(result.locked).toBe(true);
    expect(result.attemptsRemaining).toBe(0);
  });

  it('inserts failed attempt with correct parameters', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '1' }] });

    await recordFailedAttempt('u-001', 't-1', '10.0.0.1');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('login_attempts');
    expect(sql).toContain('FALSE');
    expect(params).toEqual(['u-001', 't-1', '10.0.0.1']);
  });

  it('counts only failures within the last hour', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

    await recordFailedAttempt('u-001', 't-1', '1.1.1.1');
    const [countSql] = mockQuery.mock.calls[1];
    expect(countSql).toContain("INTERVAL '1 hour'");
    expect(countSql).toContain('success = FALSE');
  });
});

describe('DAuth LoginProtection — recordSuccessfulLogin', () => {
  it('inserts success record and clears failed attempts', async () => {
    // INSERT success
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // DELETE failed attempts (clearFailedAttempts)
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await recordSuccessfulLogin('u-001', 't-1', '1.2.3.4');
    expect(mockQuery).toHaveBeenCalledTimes(2);

    const [insertSql, insertParams] = mockQuery.mock.calls[0];
    expect(insertSql).toContain('TRUE');
    expect(insertParams).toEqual(['u-001', 't-1', '1.2.3.4']);

    const [deleteSql] = mockQuery.mock.calls[1];
    expect(deleteSql).toContain('DELETE FROM login_attempts');
  });

  it('records correct user and IP', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await recordSuccessfulLogin('u-999', 't-2', '192.168.1.1');
    const [, params] = mockQuery.mock.calls[0];
    expect(params[0]).toBe('u-999');
    expect(params[1]).toBe('t-2');
    expect(params[2]).toBe('192.168.1.1');
  });
});

describe('DAuth LoginProtection — lockAccount', () => {
  it('sets user status to locked with duration', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await lockAccount('u-001', 't-1', 30);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'locked'");
    expect(sql).toContain('locked_until');
    expect(params[1]).toBe('u-001');
    // locked_until should be ~30 minutes from now
    const lockedUntil = params[0] as Date;
    const diffMs = lockedUntil.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(29 * 60_000);
    expect(diffMs).toBeLessThanOrEqual(30 * 60_000);
  });

  it('publishes account locked event', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await lockAccount('u-001', 't-1', 15);

    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.account.locked',
      't-1',
      expect.objectContaining({
        userId: 'u-001',
        reason: 'brute_force_protection',
      }),
    );
  });

  it('does not throw if publish fails', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    mockPublish.mockRejectedValue(new Error('bus down'));
    await expect(lockAccount('u-001', 't-1', 30)).resolves.toBeUndefined();
  });
});

describe('DAuth LoginProtection — unlockAccount', () => {
  it('sets status to active and clears locked_until', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await unlockAccount('u-001');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("status = 'active'");
    expect(sql).toContain('locked_until = NULL');
    expect(params).toEqual(['u-001']);
  });

  it('clears failed attempts after unlocking', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await unlockAccount('u-001');

    // Second call should be DELETE from login_attempts
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [deleteSql] = mockQuery.mock.calls[1];
    expect(deleteSql).toContain('DELETE FROM login_attempts');
  });
});

describe('DAuth LoginProtection — isAccountLocked', () => {
  it('returns true when user not found (deny by default)', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await isAccountLocked('nonexistent');
    expect(result).toBe(true);
  });

  it('returns false when status is not locked', async () => {
    mockQuery.mockResolvedValue({ rows: [{ status: 'active', locked_until: null }] });
    const result = await isAccountLocked('u-001');
    expect(result).toBe(false);
  });

  it('returns true when locked and lock has not expired', async () => {
    const futureDate = new Date(Date.now() + 60 * 60_000).toISOString();
    mockQuery.mockResolvedValue({
      rows: [{ status: 'locked', locked_until: futureDate }],
    });
    const result = await isAccountLocked('u-001');
    expect(result).toBe(true);
  });

  it('auto-unlocks and returns false when lock has expired', async () => {
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    // First call: SELECT status, locked_until
    mockQuery.mockResolvedValueOnce({
      rows: [{ status: 'locked', locked_until: pastDate }],
    });
    // unlockAccount: UPDATE users
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // clearFailedAttempts: DELETE
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await isAccountLocked('u-001');
    expect(result).toBe(false);
  });
});

describe('DAuth LoginProtection — getFailedAttemptCount', () => {
  it('returns 0 when no failed attempts', async () => {
    mockQuery.mockResolvedValue({ rows: [{ cnt: '0' }] });
    const count = await getFailedAttemptCount('u-001');
    expect(count).toBe(0);
  });

  it('returns correct count from database', async () => {
    mockQuery.mockResolvedValue({ rows: [{ cnt: '3' }] });
    const count = await getFailedAttemptCount('u-001');
    expect(count).toBe(3);
  });

  it('defaults to 0 when cnt is undefined', async () => {
    mockQuery.mockResolvedValue({ rows: [{}] });
    const count = await getFailedAttemptCount('u-001');
    expect(count).toBe(0);
  });

  it('queries only within 1-hour window', async () => {
    mockQuery.mockResolvedValue({ rows: [{ cnt: '0' }] });
    await getFailedAttemptCount('u-001');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain("INTERVAL '1 hour'");
  });
});
