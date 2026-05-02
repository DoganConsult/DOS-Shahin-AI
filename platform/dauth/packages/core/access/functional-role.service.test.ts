/**
 * Functional Role Service — DAuth role registry tests
 *
 * @owner DAuth
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
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
  getFunctionalRoles,
  getFunctionalRole,
  createFunctionalRole,
  deactivateFunctionalRole,
  getRolePermissions,
} from './functional-role.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ---------------------------------------------------------------------------
// getFunctionalRoles
// ---------------------------------------------------------------------------
describe('getFunctionalRoles', () => {
  it('returns mapped role rows', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { role_id: 'r1', role_code: 'grc_admin', name_en: 'GRC Admin', name_ar: 'مدير GRC', module_code: null, is_system: true, is_active: true },
        { role_id: 'r2', role_code: 'risk_analyst', name_en: 'Risk Analyst', name_ar: 'محلل مخاطر', module_code: 'risk', is_system: false, is_active: true },
      ],
      rowCount: 2,
    });

    const result = await getFunctionalRoles('t1');
    expect(result).toHaveLength(2);
    expect(result[0].roleCode).toBe('grc_admin');
    expect(result[0].isSystem).toBe(true);
    expect(result[1].moduleCode).toBe('risk');
  });

  it('returns empty array when no roles exist', async () => {
    const result = await getFunctionalRoles('t1');
    expect(result).toEqual([]);
  });

  it('applies module filter when moduleCode is provided', async () => {
    await getFunctionalRoles('t1', 'audit');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('module_code = $1'),
      ['audit'],
    );
  });

  it('does not apply module filter when moduleCode is omitted', async () => {
    await getFunctionalRoles('t1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.not.stringContaining('module_code = $1'),
      [],
    );
  });
});

// ---------------------------------------------------------------------------
// getFunctionalRole
// ---------------------------------------------------------------------------
describe('getFunctionalRole', () => {
  it('returns a role when found', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ role_id: 'r1', role_code: 'grc_admin', name_en: 'GRC Admin', name_ar: '', module_code: null, is_system: true, is_active: true }],
      rowCount: 1,
    });

    const result = await getFunctionalRole('t1', 'grc_admin');
    expect(result).not.toBeNull();
    expect(result!.roleId).toBe('r1');
    expect(result!.isSystem).toBe(true);
  });

  it('returns null when not found', async () => {
    const result = await getFunctionalRole('t1', 'nonexistent');
    expect(result).toBeNull();
  });

  it('queries with LIMIT 1', async () => {
    await getFunctionalRole('t1', 'viewer');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 1'),
      ['viewer'],
    );
  });
});

// ---------------------------------------------------------------------------
// createFunctionalRole
// ---------------------------------------------------------------------------
describe('createFunctionalRole', () => {
  it('creates a role and publishes event', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ role_id: 'new-uuid' }],
      rowCount: 1,
    });

    const result = await createFunctionalRole(
      't1',
      { roleCode: 'custom_reviewer', nameEn: 'Custom Reviewer', nameAr: 'مراجع مخصص', moduleCode: 'audit', isSystem: false },
      'admin',
    );

    expect(result.roleId).toBe('new-uuid');
    expect(result.isActive).toBe(true);
    expect(result.roleCode).toBe('custom_reviewer');
    expect(mockPublish).toHaveBeenCalledWith('dauth.role.created', 't1', expect.objectContaining({
      roleCode: 'custom_reviewer',
    }));
  });

  it('inserts with correct params including createdBy', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ role_id: 'id' }], rowCount: 1 });

    await createFunctionalRole(
      't1',
      { roleCode: 'test_role', nameEn: 'Test', nameAr: 'اختبار', moduleCode: null, isSystem: false },
      'user_42',
    );

    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['test_role', 'Test', 'اختبار', null, false, 'user_42'],
    );
  });

  it('returns the composed role object with provided fields', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ role_id: 'r-id' }], rowCount: 1 });

    const result = await createFunctionalRole(
      't1',
      { roleCode: 'sys_admin', nameEn: 'Sys Admin', nameAr: '', moduleCode: null, isSystem: true },
      'admin',
    );

    expect(result.isSystem).toBe(true);
    expect(result.moduleCode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deactivateFunctionalRole
// ---------------------------------------------------------------------------
describe('deactivateFunctionalRole', () => {
  it('returns true and publishes event when a non-system role is deactivated', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await deactivateFunctionalRole('t1', 'custom_role', 'admin');
    expect(result).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith('dauth.role.deactivated', 't1', expect.objectContaining({
      roleCode: 'custom_role',
    }));
  });

  it('returns false when no rows affected (system role or not found)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await deactivateFunctionalRole('t1', 'system_role', 'admin');
    expect(result).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('only updates non-system roles (SQL includes is_system = FALSE)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await deactivateFunctionalRole('t1', 'any_role', 'admin');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_system = FALSE'),
      ['any_role'],
    );
  });
});

// ---------------------------------------------------------------------------
// getRolePermissions
// ---------------------------------------------------------------------------
describe('getRolePermissions', () => {
  it('returns permission codes for an active role', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { permission_code: 'risk.register.view' },
        { permission_code: 'risk.register.create' },
      ],
      rowCount: 2,
    });

    const result = await getRolePermissions('t1', 'risk_analyst');
    expect(result).toEqual(['risk.register.view', 'risk.register.create']);
  });

  it('returns empty array when role has no permissions', async () => {
    const result = await getRolePermissions('t1', 'empty_role');
    expect(result).toEqual([]);
  });

  it('queries with the correct role code parameter', async () => {
    await getRolePermissions('t1', 'grc_admin');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('fr.role_code = $1'),
      ['grc_admin'],
    );
  });
});
