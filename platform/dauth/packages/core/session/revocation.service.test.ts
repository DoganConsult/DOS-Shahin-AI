import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

const mockBlacklistToken = vi.fn();
const mockRevokeAllUserTokens = vi.fn();
vi.mock('./token-blacklist.service', () => ({
  blacklistToken: (...args: unknown[]) => mockBlacklistToken(...args),
  revokeAllUserTokens: (...args: unknown[]) => mockRevokeAllUserTokens(...args),
}));

const mockRevokeAllFamiliesForUser = vi.fn();
vi.mock('./refresh.service', () => ({
  revokeAllFamiliesForUser: (...args: unknown[]) => mockRevokeAllFamiliesForUser(...args),
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  revokeSession,
  revokeAllUserSessions,
  revokeSessionsByTenant,
} from './revocation.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockBlacklistToken.mockResolvedValue(undefined);
  mockRevokeAllUserTokens.mockResolvedValue(undefined);
  mockRevokeAllFamiliesForUser.mockResolvedValue(0);
  mockPublish.mockResolvedValue(undefined);
});

describe('DAuth RevocationService', () => {
  describe('revokeSession', () => {
    it('blacklists the jti and publishes revocation event', async () => {
      await revokeSession('u-1', 'jti-1', 'user_logout', 'u-1');
      expect(mockBlacklistToken).toHaveBeenCalledWith('jti-1', 'u-1');
      expect(mockPublish).toHaveBeenCalledWith(
        'dauth.session.revoked',
        '',
        expect.objectContaining({
          userId: 'u-1',
          jti: 'jti-1',
          reason: 'user_logout',
          revokedBy: 'u-1',
        }),
      );
    });

    it('publishes event with revokedAt timestamp', async () => {
      await revokeSession('u-1', 'jti-1', 'admin_action', 'admin-1');
      const eventPayload = mockPublish.mock.calls[0][2];
      expect(eventPayload.revokedAt).toBeTruthy();
      expect(eventPayload.revokedBy).toBe('admin-1');
    });

    it('propagates blacklist errors', async () => {
      mockBlacklistToken.mockRejectedValue(new Error('DB error'));
      await expect(revokeSession('u-1', 'jti-1', 'error', 'sys')).rejects.toThrow('DB error');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('revokes all tokens and families and publishes bulk event', async () => {
      mockRevokeAllFamiliesForUser.mockResolvedValue(3);
      const result = await revokeAllUserSessions('u-1', 'password_change', 'u-1');
      expect(mockRevokeAllUserTokens).toHaveBeenCalledWith('u-1');
      expect(mockRevokeAllFamiliesForUser).toHaveBeenCalledWith('u-1');
      expect(result.familiesRevoked).toBe(3);
      expect(mockPublish).toHaveBeenCalledWith(
        'dauth.sessions.bulk_revoked',
        '',
        expect.objectContaining({ userId: 'u-1', familiesRevoked: 3 }),
      );
    });

    it('returns zero counts when user has no active sessions', async () => {
      mockRevokeAllFamiliesForUser.mockResolvedValue(0);
      const result = await revokeAllUserSessions('u-empty', 'cleanup', 'sys');
      expect(result.tokensRevoked).toBe(0);
      expect(result.familiesRevoked).toBe(0);
    });

    it('still publishes event even with zero revocations', async () => {
      await revokeAllUserSessions('u-1', 'test', 'sys');
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });
  });

  describe('revokeSessionsByTenant', () => {
    it('revokes sessions for all active tenant users', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ user_id: 'u-1' }, { user_id: 'u-2' }, { user_id: 'u-3' }],
      });
      const count = await revokeSessionsByTenant('t-1', 'tenant_lockdown', 'admin-1');
      expect(count).toBe(3);
      expect(mockRevokeAllUserTokens).toHaveBeenCalledTimes(3);
      expect(mockRevokeAllFamiliesForUser).toHaveBeenCalledTimes(3);
    });

    it('returns 0 when tenant has no active users', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const count = await revokeSessionsByTenant('t-empty', 'cleanup', 'sys');
      expect(count).toBe(0);
    });

    it('queries tenant_user_memberships for active users', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      await revokeSessionsByTenant('t-1', 'test', 'sys');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('tenant_user_memberships');
      expect(sql).toContain("status = 'active'");
      expect(params[0]).toBe('t-1');
    });

    it('processes each user sequentially', async () => {
      const callOrder: string[] = [];
      mockQuery.mockResolvedValue({ rows: [{ user_id: 'u-1' }, { user_id: 'u-2' }] });
      mockRevokeAllUserTokens.mockImplementation(async () => { callOrder.push('tokens'); });
      mockRevokeAllFamiliesForUser.mockImplementation(async () => { callOrder.push('families'); return 0; });
      await revokeSessionsByTenant('t-1', 'test', 'sys');
      // Each user should have both tokens and families revoked
      expect(callOrder.filter(c => c === 'tokens')).toHaveLength(2);
      expect(callOrder.filter(c => c === 'families')).toHaveLength(2);
    });
  });
});
