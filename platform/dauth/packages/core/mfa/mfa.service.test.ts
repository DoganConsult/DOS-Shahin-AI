import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../audit/decision-log.service', () => ({
  logAuthDecision: vi.fn(),
}));

import {
  getMfaStatus,
  isMfaRequired,
  generateEmailCode,
  createEmailChallenge,
  verifyEmailChallenge,
  enableMfa,
  disableMfa,
} from './mfa.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DAuth MFA — getMfaStatus', () => {
  it('returns disabled when no MFA record found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const status = await getMfaStatus('u-001');
    expect(status).toEqual({ enabled: false, mfaType: null });
  });

  it('returns enabled with mfaType when record exists', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ mfa_type: 'email', enabled: true }],
    });
    const status = await getMfaStatus('u-001');
    expect(status).toEqual({ enabled: true, mfaType: 'email' });
  });

  it('returns enabled with totp type', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ mfa_type: 'totp', enabled: true }],
    });
    const status = await getMfaStatus('u-001');
    expect(status.mfaType).toBe('totp');
  });

  it('queries user_mfa table for enabled records', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await getMfaStatus('u-999');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('user_mfa');
    expect(sql).toContain('enabled = TRUE');
    expect(params).toEqual(['u-999']);
  });
});

describe('DAuth MFA — isMfaRequired', () => {
  it('returns false when MFA is not enabled', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const required = await isMfaRequired('u-001');
    expect(required).toBe(false);
  });

  it('returns true when MFA is enabled', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ mfa_type: 'email', enabled: true }],
    });
    const required = await isMfaRequired('u-001');
    expect(required).toBe(true);
  });
});

describe('DAuth MFA — generateEmailCode', () => {
  it('returns a 6-digit numeric string', () => {
    const code = generateEmailCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('returns codes within valid range', () => {
    // Run multiple times to verify range
    for (let i = 0; i < 20; i++) {
      const code = generateEmailCode();
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    }
  });
});

describe('DAuth MFA — createEmailChallenge', () => {
  it('returns a code and expiry date', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    const result = await createEmailChallenge('u-001', 't-1');
    expect(result.code).toMatch(/^\d{6}$/);
    expect(result.expiresAt).toBeInstanceOf(Date);
    // Expiry should be ~10 minutes from now
    const diffMs = result.expiresAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(9 * 60_000);
    expect(diffMs).toBeLessThanOrEqual(10 * 60_000);
  });

  it('inserts challenge into email_verification_tokens with mfa_login purpose', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await createEmailChallenge('u-001', 't-1');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('email_verification_tokens');
    expect(sql).toContain('mfa_login');
    expect(params[0]).toBe('u-001');
    expect(params[3]).toBe('t-1');
  });

  it('uses ON CONFLICT to upsert for same user', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await createEmailChallenge('u-001', 't-1');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('ON CONFLICT');
    expect(sql).toContain('DO UPDATE SET token');
  });
});

describe('DAuth MFA — verifyEmailChallenge', () => {
  it('returns false when code not found or expired', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await verifyEmailChallenge('u-001', '000000');
    expect(result).toBe(false);
  });

  it('returns true and deletes token when code is valid', async () => {
    // SELECT finds token
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    // DELETE token
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await verifyEmailChallenge('u-001', '123456');
    expect(result).toBe(true);

    // Verify delete was called
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const [deleteSql, deleteParams] = mockQuery.mock.calls[1];
    expect(deleteSql).toContain('DELETE FROM email_verification_tokens');
    expect(deleteParams).toEqual(['u-001', '123456']);
  });

  it('checks expiry in verification query', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await verifyEmailChallenge('u-001', '111111');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('expires_at > NOW()');
  });

  it('does not throw if delete fails after verification', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    mockQuery.mockRejectedValueOnce(new Error('delete failed'));

    const result = await verifyEmailChallenge('u-001', '123456');
    expect(result).toBe(true);
  });
});

describe('DAuth MFA — enableMfa', () => {
  it('inserts MFA record with email type', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await enableMfa('u-001', 'email');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('INSERT INTO user_mfa');
    expect(sql).toContain('enabled = TRUE');
    expect(params[0]).toBe('u-001');
    expect(params[1]).toBe('email');
    expect(params[2]).toBeNull(); // no secret for email
  });

  it('inserts MFA record with totp type and secret', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await enableMfa('u-001', 'totp', 'JBSWY3DPEHPK3PXP');

    const [, params] = mockQuery.mock.calls[0];
    expect(params[1]).toBe('totp');
    expect(params[2]).toBe('JBSWY3DPEHPK3PXP');
  });

  it('upserts on conflict for same user', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await enableMfa('u-001', 'email');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('ON CONFLICT (user_id)');
    expect(sql).toContain('DO UPDATE SET mfa_type');
  });
});

describe('DAuth MFA — disableMfa', () => {
  it('sets enabled to false for user', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await disableMfa('u-001');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('UPDATE user_mfa');
    expect(sql).toContain('enabled = FALSE');
    expect(params).toEqual(['u-001']);
  });

  it('does not delete the record (preserves audit trail)', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await disableMfa('u-001');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toContain('DELETE');
    expect(sql).toContain('UPDATE');
  });

  it('targets correct user', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    await disableMfa('u-999');
    const [, params] = mockQuery.mock.calls[0];
    expect(params).toEqual(['u-999']);
  });
});
