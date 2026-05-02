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

import {
  requestPasswordReset,
  validateResetToken,
  completePasswordReset,
  requestEmailVerification,
  verifyEmail,
} from './credential-recovery.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockPublish.mockResolvedValue(undefined);
});

describe('DAuth CredentialRecovery — requestPasswordReset', () => {
  it('returns null when email not found', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await requestPasswordReset('nobody@test.com', 't-1');
    expect(result).toBeNull();
  });

  it('returns null when user exists but query returns no active user', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await requestPasswordReset('inactive@test.com', 't-1');
    expect(result).toBeNull();
    // Should not attempt to insert a token
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('creates a reset token for active user and publishes event', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u-001' }] });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await requestPasswordReset('admin@test.com', 't-1');
    expect(result).not.toBeNull();
    expect(result!.token).toBeTruthy();
    expect(result!.token.length).toBe(64); // 32 bytes hex
    expect(result!.expiresAt).toBeInstanceOf(Date);

    // Verify queries: 1=user lookup, 2=invalidate old tokens, 3=insert new token
    expect(mockQuery).toHaveBeenCalledTimes(3);
    const [insertSql] = mockQuery.mock.calls[2];
    expect(insertSql).toContain('password_reset_tokens');

    // Verify event published
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.password_reset.requested',
      't-1',
      expect.objectContaining({ userId: 'u-001', email: 'admin@test.com' }),
    );
  });

  it('uses case-insensitive email lookup', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await requestPasswordReset('Admin@Test.COM', 't-1');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('LOWER(email) = LOWER($1)');
  });
});

describe('DAuth CredentialRecovery — validateResetToken', () => {
  it('returns null for invalid or expired token', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await validateResetToken('bad-token');
    expect(result).toBeNull();
  });

  it('returns userId and tenantId for valid token', async () => {
    mockQuery.mockResolvedValue({
      rows: [{ user_id: 'u-001', tenant_id: 't-1' }],
    });
    const result = await validateResetToken('valid-token');
    expect(result).toEqual({ userId: 'u-001', tenantId: 't-1' });
  });

  it('checks expiry and used_at in query', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await validateResetToken('some-token');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('expires_at > NOW()');
    expect(sql).toContain('used = FALSE');
  });
});

describe('DAuth CredentialRecovery — completePasswordReset', () => {
  it('returns false for invalid token', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await completePasswordReset('bad-token', 'new-hash');
    expect(result).toBe(false);
  });

  it('updates password and marks token used on success', async () => {
    // validateResetToken call
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 'u-001', tenant_id: 't-1' }],
    });
    // UPDATE users password_hash
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // UPDATE password_reset_tokens used_at
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await completePasswordReset('valid-token', 'new-hash');
    expect(result).toBe(true);

    // Verify password update
    const [updateSql, updateParams] = mockQuery.mock.calls[1];
    expect(updateSql).toContain('UPDATE users SET password_hash');
    expect(updateParams).toContain('new-hash');
    expect(updateParams).toContain('u-001');

    // Verify token marked as used
    const [tokenSql] = mockQuery.mock.calls[2];
    expect(tokenSql).toContain('used = TRUE');

    // Verify completion event
    expect(mockPublish).toHaveBeenCalledWith(
      'dauth.password_reset.completed',
      't-1',
      expect.objectContaining({ userId: 'u-001' }),
    );
  });

  it('publishes event even if publish fails gracefully', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ user_id: 'u-001', tenant_id: 't-1' }],
    });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockPublish.mockRejectedValue(new Error('event bus down'));

    const result = await completePasswordReset('valid-token', 'hash');
    expect(result).toBe(true);
  });
});

describe('DAuth CredentialRecovery — requestEmailVerification', () => {
  it('creates a verification token with 24h expiry', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    const result = await requestEmailVerification('u-001', 'a@b.com', 't-1');
    expect(result.token).toBeTruthy();
    expect(result.token.length).toBe(64);
    expect(result.expiresAt).toBeInstanceOf(Date);
    // Expiry should be ~24 hours from now
    const diffMs = result.expiresAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(23 * 60 * 60_000);
    expect(diffMs).toBeLessThanOrEqual(24 * 60 * 60_000);
  });

  it('inserts into email_verification_tokens table', async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    await requestEmailVerification('u-001', 'a@b.com', 't-1');
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain('email_verification_tokens');
    expect(params[0]).toBe('u-001');
    expect(params[2]).toBe('t-1');
  });
});

describe('DAuth CredentialRecovery — verifyEmail', () => {
  it('returns false for invalid token', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const result = await verifyEmail('bad-token');
    expect(result).toBe(false);
  });

  it('marks email verified and deletes token on success', async () => {
    // Token lookup
    mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u-001' }] });
    // UPDATE users email_verified
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    // DELETE token
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await verifyEmail('valid-token');
    expect(result).toBe(true);

    const [updateSql] = mockQuery.mock.calls[1];
    expect(updateSql).toContain('email_verified = TRUE');

    const [deleteSql] = mockQuery.mock.calls[2];
    expect(deleteSql).toContain('DELETE FROM email_verification_tokens');
  });

  it('checks token expiry in query', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    await verifyEmail('some-token');
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toContain('expires_at > NOW()');
  });
});
