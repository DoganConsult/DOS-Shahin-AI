import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/database/database', () => ({
  safeQuery: vi.fn(),
  tenantSchema: vi.fn((tid: string) => `tenant_${tid}`),
}));
vi.mock('../../dos/observability/logger.service', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  getRolePermissionCodes,
  hasRolePermission,
  getEffectivePermissionCodes,
  invalidateRolePermissionCache,
} from './role-permission-lookup.service';
import { safeQuery } from '@dos/db';

const TENANT = 't1';

describe('RolePermissionLookupService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateRolePermissionCache(); // clear cache between tests
  });

  // ── getRolePermissionCodes ──────────────────────────────────────────────

  describe('getRolePermissionCodes', () => {
    it('should return permission codes from DB', async () => {
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [
          { permission_code: 'risk.register.read' },
          { permission_code: 'risk.register.write' },
        ],
      });

      const result = await getRolePermissionCodes(TENANT, 'risk_manager');
      expect(result).toEqual(['risk.register.read', 'risk.register.write']);
      expect(safeQuery).toHaveBeenCalledTimes(1);
    });

    it('should cache results — second call should not hit DB', async () => {
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [{ permission_code: 'audit.finding.read' }],
      });

      const first = await getRolePermissionCodes(TENANT, 'auditor');
      const second = await getRolePermissionCodes(TENANT, 'auditor');

      expect(first).toEqual(['audit.finding.read']);
      expect(second).toEqual(['audit.finding.read']);
      expect(safeQuery).toHaveBeenCalledTimes(1); // only one DB call
    });

    it('should return empty array on DB error (graceful failure)', async () => {
      (safeQuery as { mock: Function }).mockRejectedValueOnce(new Error('connection refused'));

      const result = await getRolePermissionCodes(TENANT, 'bad_role');
      expect(result).toEqual([]);
    });
  });

  // ── hasRolePermission ───────────────────────────────────────────────────

  describe('hasRolePermission', () => {
    it('should return true for existing permission', async () => {
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [
          { permission_code: 'compliance.control.read' },
          { permission_code: 'compliance.control.write' },
        ],
      });

      const result = await hasRolePermission(TENANT, 'compliance_officer', 'compliance.control.read');
      expect(result).toBe(true);
    });

    it('should return false for missing permission', async () => {
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [{ permission_code: 'compliance.control.read' }],
      });

      const result = await hasRolePermission(TENANT, 'compliance_officer', 'compliance.control.delete');
      expect(result).toBe(false);
    });
  });

  // ── getEffectivePermissionCodes ─────────────────────────────────────────

  describe('getEffectivePermissionCodes', () => {
    it('should merge permissions from multiple roles (deduped, sorted)', async () => {
      // First role: risk_manager
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [
          { permission_code: 'risk.register.read' },
          { permission_code: 'shared.dashboard.view' },
        ],
      });
      // Second role: auditor
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [
          { permission_code: 'audit.finding.read' },
          { permission_code: 'shared.dashboard.view' }, // duplicate
        ],
      });

      const result = await getEffectivePermissionCodes(TENANT, ['risk_manager', 'auditor']);
      expect(result).toEqual([
        'audit.finding.read',
        'risk.register.read',
        'shared.dashboard.view',
      ]);
    });
  });

  // ── invalidateRolePermissionCache ───────────────────────────────────────

  describe('invalidateRolePermissionCache', () => {
    it('should clear cache so next call hits DB again', async () => {
      // Populate cache
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [{ permission_code: 'p1' }],
      });
      await getRolePermissionCodes(TENANT, 'admin');
      expect(safeQuery).toHaveBeenCalledTimes(1);

      // Invalidate
      invalidateRolePermissionCache(TENANT);

      // Next call should hit DB again
      (safeQuery as { mock: Function }).mockResolvedValueOnce({
        rows: [{ permission_code: 'p1' }, { permission_code: 'p2' }],
      });
      const result = await getRolePermissionCodes(TENANT, 'admin');
      expect(safeQuery).toHaveBeenCalledTimes(2);
      expect(result).toEqual(['p1', 'p2']);
    });
  });
});
