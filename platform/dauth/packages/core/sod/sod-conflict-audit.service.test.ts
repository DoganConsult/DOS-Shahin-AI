import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

const mockEvaluateSod = vi.fn();
vi.mock('./sod-engine', () => ({
  evaluateSod: (...args: unknown[]) => mockEvaluateSod(...args),
}));

const mockPublish = vi.fn();
vi.mock('../../dos/events/event-bus', () => ({
  publish: (...args: unknown[]) => mockPublish(...args),
}));

vi.mock('../../dos/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  detectConflictsForUser,
  getUnresolvedConflicts,
  resolveConflict,
  runTenantWideSodAudit,
} from './sod-conflict-audit.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  mockEvaluateSod.mockResolvedValue({ passed: true, outcome: 'allow', violations: [] });
  mockPublish.mockResolvedValue(undefined);
});

describe('DAuth SodConflictAuditService', () => {
  describe('detectConflictsForUser', () => {
    it('returns conflicts when SoD violations detected', async () => {
      // First call: get user role assignments
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ role_code: 'admin' }, { role_code: 'auditor' }],
      });
      mockEvaluateSod.mockResolvedValue({
        passed: false,
        outcome: 'block',
        violations: [
          { roleA: 'admin', roleB: 'auditor', conflictLevel: 'critical' },
        ],
      });

      const conflicts = await detectConflictsForUser('t-1', 'u-1');
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].userId).toBe('u-1');
      expect(conflicts[0].roleCodeA).toBe('admin');
      expect(conflicts[0].roleCodeB).toBe('auditor');
      expect(conflicts[0].conflictLevel).toBe('critical');
      expect(conflicts[0].resolvedAt).toBeNull();
    });

    it('publishes event when conflicts are detected', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ role_code: 'a' }, { role_code: 'b' }],
      });
      mockEvaluateSod.mockResolvedValue({
        passed: false,
        outcome: 'block',
        violations: [{ roleA: 'a', roleB: 'b', conflictLevel: 'high' }],
      });

      await detectConflictsForUser('t-1', 'u-1');
      expect(mockPublish).toHaveBeenCalledWith(
        'dauth.sod.conflicts_detected',
        't-1',
        expect.objectContaining({ userId: 'u-1', conflictCount: 1 }),
      );
    });

    it('returns empty array when no violations found', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ role_code: 'viewer' }] });
      mockEvaluateSod.mockResolvedValue({ passed: true, outcome: 'allow', violations: [] });

      const conflicts = await detectConflictsForUser('t-1', 'u-1');
      expect(conflicts).toEqual([]);
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('passes collected role codes to evaluateSod', async () => {
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ role_code: 'admin' }, { role_code: 'approver' }, { role_code: 'viewer' }],
      });

      await detectConflictsForUser('t-1', 'u-1');
      expect(mockEvaluateSod).toHaveBeenCalledWith('t-1', ['admin', 'approver', 'viewer']);
    });

    it('handles user with no role assignments', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      const conflicts = await detectConflictsForUser('t-1', 'u-no-roles');
      expect(conflicts).toEqual([]);
      expect(mockEvaluateSod).toHaveBeenCalledWith('t-1', []);
    });
  });

  describe('getUnresolvedConflicts', () => {
    it('returns mapped unresolved conflict records', async () => {
      const now = new Date();
      mockSafeQuery.mockResolvedValue({
        rows: [{
          conflict_id: 'c-1',
          user_id: 'u-1',
          rule_code: 'SOD001',
          role_code_a: 'admin',
          role_code_b: 'auditor',
          conflict_level: 'critical',
          detected_at: now,
          resolved_at: null,
          resolution: null,
        }],
      });

      const conflicts = await getUnresolvedConflicts('t-1');
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictId).toBe('c-1');
      expect(conflicts[0].resolvedAt).toBeNull();
      expect(conflicts[0].resolution).toBeNull();
    });

    it('returns empty array when all conflicts resolved', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [] });
      const conflicts = await getUnresolvedConflicts('t-clean');
      expect(conflicts).toEqual([]);
    });

    it('queries sod_conflict_log with resolved_at IS NULL', async () => {
      await getUnresolvedConflicts('t-1');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('sod_conflict_log');
      expect(sql).toContain('resolved_at IS NULL');
    });
  });

  describe('resolveConflict', () => {
    it('updates conflict with resolution and resolved_by', async () => {
      await resolveConflict('t-1', 'c-1', 'waiver_granted', 'admin-1');
      const [sql, params] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('UPDATE');
      expect(sql).toContain('sod_conflict_log');
      expect(sql).toContain('resolved_at = NOW()');
      expect(params[0]).toBe('waiver_granted');
      expect(params[1]).toBe('admin-1');
      expect(params[2]).toBe('c-1');
    });

    it('uses correct tenant schema', async () => {
      await resolveConflict('tenant-abc', 'c-1', 'role_removed', 'admin');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('tenant_tenant-abc');
    });

    it('does not throw when conflict_id does not exist', async () => {
      mockSafeQuery.mockResolvedValue({ rowCount: 0 });
      await expect(resolveConflict('t-1', 'c-missing', 'test', 'admin')).resolves.not.toThrow();
    });
  });

  describe('runTenantWideSodAudit', () => {
    it('returns total conflict count across all users', async () => {
      // First call: get all active users
      mockSafeQuery
        .mockResolvedValueOnce({
          rows: [{ user_id: 'u-1' }, { user_id: 'u-2' }],
        })
        // Subsequent calls for detectConflictsForUser: role assignments per user
        .mockResolvedValueOnce({ rows: [{ role_code: 'admin' }, { role_code: 'auditor' }] })
        .mockResolvedValueOnce({ rows: [{ role_code: 'viewer' }] });

      mockEvaluateSod
        .mockResolvedValueOnce({
          passed: false, outcome: 'block',
          violations: [{ roleA: 'admin', roleB: 'auditor', conflictLevel: 'critical' }],
        })
        .mockResolvedValueOnce({ passed: true, outcome: 'allow', violations: [] });

      const total = await runTenantWideSodAudit('t-1');
      expect(total).toBe(1);
    });

    it('returns 0 when no users have assignments', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      const total = await runTenantWideSodAudit('t-empty');
      expect(total).toBe(0);
    });

    it('queries enterprise_user_role_assignments for active users', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      await runTenantWideSodAudit('t-1');
      const [sql] = mockSafeQuery.mock.calls[0];
      expect(sql).toContain('enterprise_user_role_assignments');
      expect(sql).toContain('is_active = TRUE');
    });

    it('accumulates conflicts from multiple users', async () => {
      mockSafeQuery
        .mockResolvedValueOnce({ rows: [{ user_id: 'u-1' }, { user_id: 'u-2' }] })
        .mockResolvedValueOnce({ rows: [{ role_code: 'a' }, { role_code: 'b' }] })
        .mockResolvedValueOnce({ rows: [{ role_code: 'c' }, { role_code: 'd' }] });

      mockEvaluateSod
        .mockResolvedValueOnce({
          passed: false, outcome: 'block',
          violations: [
            { roleA: 'a', roleB: 'b', conflictLevel: 'high' },
            { roleA: 'a', roleB: 'b', conflictLevel: 'medium' },
          ],
        })
        .mockResolvedValueOnce({
          passed: false, outcome: 'block',
          violations: [{ roleA: 'c', roleB: 'd', conflictLevel: 'high' }],
        });

      const total = await runTenantWideSodAudit('t-1');
      expect(total).toBe(3);
    });
  });
});
