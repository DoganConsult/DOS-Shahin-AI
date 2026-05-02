import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('@dos/db', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('@dos/platform-core/observability', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@dos/platform-core/resilience', () => ({
  catchHandler: () => () => {},
  EC: { EVENT_BUS: 'EVENT_BUS' },
}));

import { getAccessSnapshot, canPerform, accessSnapshotService } from './access-snapshot.service';

describe('DAuth AccessSnapshotService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccessSnapshot', () => {
    it('returns a snapshot with user info, roles, permissions', async () => {
      // Mock user query
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'u-001', email: 'u@test.com', name: 'User', role: 'admin', status: 'active' }],
      });
      // Mock tenant membership
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ status: 'active', membership_type: 'owner', created_at: '2024-01-01' }],
      });
      // Mock tenant
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ status: 'active', plan: 'enterprise' }],
      });
      // Mock roles
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ code: 'admin' }] });
      // Mock permissions
      mockSafeQuery.mockResolvedValueOnce({
        rows: [{ permission_code: 'risk.view' }, { permission_code: 'risk.edit' }],
      });
      // Mock access profiles
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      // Mock delegations
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      // Mock SoD
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      // Mock modules
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ module_code: 'risk' }] });

      const snapshot = await getAccessSnapshot('t-001', 'u-001');
      expect(snapshot).toBeDefined();
      expect(snapshot.effectivePermissions).toContain('risk.view');
      expect(snapshot.effectivePermissions).toContain('risk.edit');
    });
  });

  describe('canPerform', () => {
    it('returns true when user has the permission', async () => {
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ user_id: 'u-001', email: 'u@test.com', name: 'User', role: 'admin', status: 'active' }] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ status: 'active', membership_type: 'owner', created_at: '2024-01-01' }] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ status: 'active', plan: 'enterprise' }] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ code: 'admin' }] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ permission_code: 'risk.view' }] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [] });
      mockSafeQuery.mockResolvedValueOnce({ rows: [{ module_code: 'risk' }] });

      const result = await canPerform('t-001', 'u-001', 'risk.view');
      expect(result).toBe(true);
    });
  });

  describe('accessSnapshotService', () => {
    it('exposes canonical API surface', () => {
      expect(accessSnapshotService.getUserAuthzPayload).toBe(getAccessSnapshot);
      expect(accessSnapshotService.can).toBe(canPerform);
    });
  });
});
