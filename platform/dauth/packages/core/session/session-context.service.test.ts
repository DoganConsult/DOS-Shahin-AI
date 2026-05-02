import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getSessionContext,
  recordSessionActivity,
  createSessionRecord,
  getActiveSessionsForUser,
  terminateExpiredSessions,
} from './session-context.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

describe('DAuth SessionContextService', () => {
  describe('getSessionContext', () => {
    it('returns mapped session context for existing session', async () => {
      const now = new Date();
      mockQuery.mockResolvedValue({
        rows: [{
          session_id: 's-1',
          user_id: 'u-1',
          tenant_id: 't-1',
          ip_address: '10.0.0.1',
          user_agent: 'TestAgent/1.0',
          created_at: now,
          last_active_at: now,
          expires_at: new Date(Date.now() + 86400000),
          revoked_at: null,
        }],
      });
      const ctx = await getSessionContext('s-1');
      expect(ctx).not.toBeNull();
      expect(ctx!.sessionId).toBe('s-1');
      expect(ctx!.userId).toBe('u-1');
      expect(ctx!.tenantId).toBe('t-1');
      expect(ctx!.principalType).toBe('human');
      expect(ctx!.ip).toBe('10.0.0.1');
      expect(ctx!.status).toBe('active');
    });

    it('returns null when session not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const ctx = await getSessionContext('s-missing');
      expect(ctx).toBeNull();
    });

    it('defaults principalType to human when null', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          session_id: 's-2',
          user_id: 'u-2',
          tenant_id: 't-1',
          principal_type: null,
          ip: null,
          user_agent: null,
          created_at: null,
          last_activity_at: null,
          status: null,
        }],
      });
      const ctx = await getSessionContext('s-2');
      expect(ctx!.principalType).toBe('human');
      expect(ctx!.ip).toBe('');
      expect(ctx!.status).toBe('active');
    });
  });

  describe('recordSessionActivity', () => {
    it('updates last_active_at for session', async () => {
      await recordSessionActivity('s-1');
      expect(mockSafeQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('UPDATE');
      expect(sql).toContain('last_active_at');
      expect(params[0]).toBe('s-1');
    });

    it('does not throw on query failure', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('DB error'));
      await expect(recordSessionActivity('s-fail')).resolves.not.toThrow();
    });
  });

  describe('createSessionRecord', () => {
    it('inserts a new session record with upsert', async () => {
      await createSessionRecord('s-1', 'u-1', 't-1', '10.0.0.1', 'Agent/1');
      expect(mockSafeQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('INSERT INTO');
      expect(sql).toContain('ON CONFLICT');
      expect(params).toEqual(['s-1', 'u-1', 't-1', '10.0.0.1', 'Agent/1']);
    });

    it('propagates DB errors', async () => {
      mockSafeQuery.mockRejectedValueOnce(new Error('constraint violation'));
      await expect(
        createSessionRecord('s-1', 'u-1', 't-1', '10.0.0.1', 'Agent/1'),
      ).rejects.toThrow('constraint violation');
    });
  });

  describe('getActiveSessionsForUser', () => {
    it('returns mapped list of active sessions', async () => {
      const now = new Date();
      mockQuery.mockResolvedValue({
        rows: [
          {
            session_id: 's-1', user_id: 'u-1', tenant_id: 't-1',
            principal_type: 'human', ip: '10.0.0.1', user_agent: 'Agent',
            created_at: now, last_activity_at: now, status: 'active',
          },
          {
            session_id: 's-2', user_id: 'u-1', tenant_id: 't-1',
            principal_type: 'agent', ip: '10.0.0.2', user_agent: 'Bot',
            created_at: now, last_activity_at: now, status: 'active',
          },
        ],
      });
      const sessions = await getActiveSessionsForUser('u-1');
      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionId).toBe('s-1');
      expect(sessions[1].principalType).toBe('human');
    });

    it('returns empty array when user has no active sessions', async () => {
      mockQuery.mockResolvedValue({ rows: [] });
      const sessions = await getActiveSessionsForUser('u-empty');
      expect(sessions).toEqual([]);
    });

    it('queries with correct userId parameter', async () => {
      await getActiveSessionsForUser('u-42');
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('user_id = $1');
      expect(params).toEqual(['u-42']);
    });
  });

  describe('terminateExpiredSessions', () => {
    it('returns count of terminated sessions', async () => {
      mockQuery.mockResolvedValue({ rowCount: 5 });
      const count = await terminateExpiredSessions(30);
      expect(count).toBe(5);
    });

    it('returns 0 when no sessions expired', async () => {
      mockQuery.mockResolvedValue({ rowCount: 0 });
      const count = await terminateExpiredSessions(480);
      expect(count).toBe(0);
    });

    it('passes timeout minutes to query', async () => {
      await terminateExpiredSessions(60);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('revoked_at = NOW()');
      expect(params[0]).toBe(60);
    });
  });
});
