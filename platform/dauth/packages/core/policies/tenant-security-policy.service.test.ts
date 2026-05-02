import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getTenantSecurityPolicy,
  updateTenantSecurityPolicy,
  getSecurityPolicyDefaults,
} from './tenant-security-policy.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DAuth TenantSecurityPolicyService', () => {
  describe('getTenantSecurityPolicy', () => {
    it('returns stored policy merged with defaults', async () => {
      mockSafeQuery.mockResolvedValue({
        rows: [{
          config: {
            maxFailedAttempts: 10,
            mfaRequired: true,
            passwordMinLength: 12,
          },
        }],
      });
      const policy = await getTenantSecurityPolicy('t-1');
      expect(policy.maxFailedAttempts).toBe(10);
      expect(policy.mfaRequired).toBe(true);
      expect(policy.passwordMinLength).toBe(12);
      // Defaults should fill in the rest
      expect(policy.lockoutDurationMinutes).toBe(30);
      expect(policy.sessionTimeoutMinutes).toBe(480);
      expect(policy.passwordRequireUppercase).toBe(true);
    });

    it('returns defaults when no policy configured', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [] });
      const policy = await getTenantSecurityPolicy('t-no-config');
      expect(policy.maxFailedAttempts).toBe(5);
      expect(policy.lockoutDurationMinutes).toBe(30);
      expect(policy.sessionTimeoutMinutes).toBe(480);
      expect(policy.mfaRequired).toBe(false);
      expect(policy.passwordMinLength).toBe(8);
      expect(policy.selfApprovalAllowed).toBe(false);
    });

    it('returns defaults when query throws an error', async () => {
      mockSafeQuery.mockRejectedValue(new Error('table not found'));
      const policy = await getTenantSecurityPolicy('t-error');
      expect(policy.maxFailedAttempts).toBe(5);
      expect(policy.passwordExpiryDays).toBe(90);
    });

    it('queries correct tenant schema', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [] });
      await getTenantSecurityPolicy('tenant-abc');
      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('tenant_tenant-abc');
      expect(sql).toContain('tenant_security_policies');
      expect(params[0]).toBe('tenant-abc');
    });

    it('handles row with null config gracefully', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [{ config: null }] });
      const policy = await getTenantSecurityPolicy('t-null');
      // Should return defaults since config is null
      expect(policy.maxFailedAttempts).toBe(5);
    });
  });

  describe('updateTenantSecurityPolicy', () => {
    it('merges patch with current policy and upserts', async () => {
      // First call from getTenantSecurityPolicy: return existing config
      mockSafeQuery
        .mockResolvedValueOnce({
          rows: [{ config: { maxFailedAttempts: 3, mfaRequired: false } }],
        })
        // Second call: the upsert
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await updateTenantSecurityPolicy('t-1', { mfaRequired: true }, 'admin-1');
      expect(result.mfaRequired).toBe(true);
      expect(result.maxFailedAttempts).toBe(3); // Preserved from existing
      expect(result.lockoutDurationMinutes).toBe(30); // From defaults
    });

    it('uses upsert with ON CONFLICT', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [] }) // getTenantSecurityPolicy returns defaults
        .mockResolvedValueOnce({ rowCount: 1 }); // upsert

      await updateTenantSecurityPolicy('t-1', { passwordMinLength: 16 }, 'admin');
      const [sql, params] = mockSafeQuery.mock.calls[1];
      expect(sql).toContain('INSERT INTO');
      expect(sql).toContain('ON CONFLICT');
      expect(sql).toContain('tenant_security_policies');
      expect(params[0]).toBe('t-1');
      expect(params[2]).toBe('admin');
    });

    it('serializes merged config as JSON', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 });

      await updateTenantSecurityPolicy('t-1', { sessionTimeoutMinutes: 60 }, 'admin');
      const [, params] = mockSafeQuery.mock.calls[1];
      const storedConfig = JSON.parse(params[1]);
      expect(storedConfig.sessionTimeoutMinutes).toBe(60);
      expect(storedConfig.maxFailedAttempts).toBe(5); // default
    });

    it('returns full merged policy including unchanged defaults', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 });

      const result = await updateTenantSecurityPolicy('t-1', { delegationMaxDurationHours: 48 }, 'admin');
      expect(result.delegationMaxDurationHours).toBe(48);
      expect(result.invitationExpiryHours).toBe(72);
      expect(result.selfApprovalAllowed).toBe(false);
    });

    it('propagates upsert DB errors', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('permission denied'));

      await expect(
        updateTenantSecurityPolicy('t-1', { mfaRequired: true }, 'admin'),
      ).rejects.toThrow('permission denied');
    });
  });

  describe('getSecurityPolicyDefaults', () => {
    it('returns the full default policy object', async () => {
      const defaults = await getSecurityPolicyDefaults();
      expect(defaults.maxFailedAttempts).toBe(5);
      expect(defaults.lockoutDurationMinutes).toBe(30);
      expect(defaults.sessionTimeoutMinutes).toBe(480);
      expect(defaults.mfaRequired).toBe(false);
      expect(defaults.passwordMinLength).toBe(8);
      expect(defaults.passwordRequireUppercase).toBe(true);
      expect(defaults.passwordRequireNumber).toBe(true);
      expect(defaults.passwordRequireSpecial).toBe(false);
      expect(defaults.passwordExpiryDays).toBe(90);
      expect(defaults.invitationExpiryHours).toBe(72);
      expect(defaults.delegationMaxDurationHours).toBe(24);
      expect(defaults.selfApprovalAllowed).toBe(false);
    });

    it('does not make any database calls', async () => {
      await getSecurityPolicyDefaults();
      expect(mockSafeQuery).not.toHaveBeenCalled();
    });

    it('returns a consistent object across calls', async () => {
      const first = await getSecurityPolicyDefaults();
      const second = await getSecurityPolicyDefaults();
      expect(first).toEqual(second);
    });
  });
});
