/**
 * Permission Service — DAuth canonical permission CRUD tests
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
  validatePermissionFormat,
  getPermissions,
  getPermission,
  createPermission,
  deactivatePermission,
  assignPermissionToRole,
  revokePermissionFromRole,
  getPermissionsByRole,
} from './permission.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ---------------------------------------------------------------------------
// validatePermissionFormat
// ---------------------------------------------------------------------------
describe('validatePermissionFormat', () => {
  it('accepts valid module.resource.action codes', () => {
    expect(validatePermissionFormat('risk.register.create')).toBe(true);
    expect(validatePermissionFormat('audit.finding.approve')).toBe(true);
    expect(validatePermissionFormat('compliance_mgmt.obligation.view')).toBe(true);
  });

  it('rejects single-segment codes', () => {
    expect(validatePermissionFormat('bad')).toBe(false);
  });

  it('rejects two-segment codes', () => {
    expect(validatePermissionFormat('no.dots')).toBe(false);
  });

  it('rejects codes with more than three segments', () => {
    expect(validatePermissionFormat('TOO.MANY.DOTS.HERE')).toBe(false);
  });

  it('rejects codes starting with uppercase or numbers', () => {
    expect(validatePermissionFormat('Risk.register.create')).toBe(false);
    expect(validatePermissionFormat('1risk.register.create')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPermissions
// ---------------------------------------------------------------------------
describe('getPermissions', () => {
  it('returns mapped permission rows', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          permission_id: 'p1',
          permission_code: 'risk.register.view',
          name_en: 'View Registers',
          name_ar: 'عرض السجلات',
          module_code: 'risk',
          is_system: false,
          is_active: true,
        },
      ],
      rowCount: 1,
    });

    const result = await getPermissions('t1');
    expect(result).toHaveLength(1);
    expect(result[0].permissionId).toBe('p1');
    expect(result[0].permissionCode).toBe('risk.register.view');
    expect(result[0].moduleCode).toBe('risk');
  });

  it('returns empty array when no permissions exist', async () => {
    const result = await getPermissions('t1');
    expect(result).toEqual([]);
  });

  it('passes moduleCode filter when provided', async () => {
    await getPermissions('t1', 'audit');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('AND module_code = $1'),
      ['audit'],
    );
  });
});

// ---------------------------------------------------------------------------
// getPermission
// ---------------------------------------------------------------------------
describe('getPermission', () => {
  it('returns a single permission when found', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          permission_id: 'p2',
          permission_code: 'audit.finding.create',
          name_en: 'Create Finding',
          name_ar: 'إنشاء ملاحظة',
          module_code: 'audit',
          is_system: true,
          is_active: true,
        },
      ],
      rowCount: 1,
    });

    const result = await getPermission('t1', 'audit.finding.create');
    expect(result).not.toBeNull();
    expect(result!.permissionCode).toBe('audit.finding.create');
    expect(result!.isSystem).toBe(true);
  });

  it('returns null when not found', async () => {
    const result = await getPermission('t1', 'nonexistent.code.here');
    expect(result).toBeNull();
  });

  it('queries the correct tenant schema', async () => {
    await getPermission('tenant_abc', 'risk.register.view');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('"tenant_tenant_abc"'),
      ['risk.register.view'],
    );
  });
});

// ---------------------------------------------------------------------------
// createPermission
// ---------------------------------------------------------------------------
describe('createPermission', () => {
  it('rejects invalid permission code format', async () => {
    await expect(
      createPermission('t1', { permissionCode: 'bad', nameEn: 'X', nameAr: 'X', moduleCode: 'risk' }, 'admin'),
    ).rejects.toThrow('Invalid permission code');
  });

  it('rejects two-segment permission codes', async () => {
    await expect(
      createPermission('t1', { permissionCode: 'no.dots', nameEn: 'X', nameAr: 'X', moduleCode: 'risk' }, 'admin'),
    ).rejects.toThrow('module.resource.action');
  });

  it('creates permission with valid format and publishes event', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          permission_id: 'new-id',
          permission_code: 'risk.register.create',
          name_en: 'Create Register',
          name_ar: 'إنشاء سجل',
          module_code: 'risk',
          is_system: false,
          is_active: true,
        },
      ],
      rowCount: 1,
    });

    const result = await createPermission(
      't1',
      { permissionCode: 'risk.register.create', nameEn: 'Create Register', nameAr: 'إنشاء سجل', moduleCode: 'risk' },
      'admin',
    );

    expect(result.permissionId).toBe('new-id');
    expect(result.isActive).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith('dauth.permission.created', 't1', expect.objectContaining({
      permissionCode: 'risk.register.create',
    }));
  });

  it('defaults isSystem to false when not provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ permission_id: 'id', permission_code: 'a.b.c', name_en: '', name_ar: '', module_code: 'a', is_system: false, is_active: true }],
      rowCount: 1,
    });

    await createPermission('t1', { permissionCode: 'a.b.c', nameEn: '', nameAr: '', moduleCode: 'a' }, 'u1');
    // The sixth param (isSystem) should be false
    expect(mockSafeQuery).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining([false]));
  });
});

// ---------------------------------------------------------------------------
// deactivatePermission
// ---------------------------------------------------------------------------
describe('deactivatePermission', () => {
  it('throws when permission not found', async () => {
    // getPermission returns null (empty rows)
    await expect(deactivatePermission('t1', 'nonexistent.perm.code', 'admin')).rejects.toThrow('not found');
  });

  it('blocks deactivation of system permissions', async () => {
    // First call from getPermission
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ permission_id: 'p1', permission_code: 'core.platform.admin', name_en: '', name_ar: '', module_code: 'core', is_system: true, is_active: true }],
      rowCount: 1,
    });

    await expect(deactivatePermission('t1', 'core.platform.admin', 'admin')).rejects.toThrow('System permission');
  });

  it('deactivates non-system permission and publishes event', async () => {
    // getPermission lookup
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ permission_id: 'p1', permission_code: 'risk.register.delete', name_en: '', name_ar: '', module_code: 'risk', is_system: false, is_active: true }],
      rowCount: 1,
    });
    // UPDATE query
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await deactivatePermission('t1', 'risk.register.delete', 'admin');

    expect(mockSafeQuery).toHaveBeenCalledTimes(2);
    expect(mockPublish).toHaveBeenCalledWith('dauth.permission.deactivated', 't1', expect.objectContaining({
      permissionCode: 'risk.register.delete',
    }));
  });
});

// ---------------------------------------------------------------------------
// assignPermissionToRole
// ---------------------------------------------------------------------------
describe('assignPermissionToRole', () => {
  it('throws when role not found', async () => {
    // Role lookup returns empty
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(assignPermissionToRole('t1', 'nonexistent_role', 'risk.register.view', 'admin'))
      .rejects.toThrow('not found or inactive');
  });

  it('throws when permission not found or inactive', async () => {
    // Role lookup succeeds
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ role_id: 'r1' }], rowCount: 1 });
    // getPermission returns empty
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(assignPermissionToRole('t1', 'grc_admin', 'nonexistent.perm.x', 'admin'))
      .rejects.toThrow('not found or inactive');
  });

  it('assigns permission and publishes event', async () => {
    // Role lookup
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ role_id: 'r1' }], rowCount: 1 });
    // getPermission lookup
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ permission_id: 'p1', permission_code: 'risk.register.view', name_en: '', name_ar: '', module_code: 'risk', is_system: false, is_active: true }],
      rowCount: 1,
    });
    // INSERT
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await assignPermissionToRole('t1', 'grc_admin', 'risk.register.view', 'admin');

    expect(mockPublish).toHaveBeenCalledWith('dauth.permission.assigned', 't1', expect.objectContaining({
      roleCode: 'grc_admin',
      permissionCode: 'risk.register.view',
    }));
  });
});

// ---------------------------------------------------------------------------
// revokePermissionFromRole
// ---------------------------------------------------------------------------
describe('revokePermissionFromRole', () => {
  it('throws when role not found', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(revokePermissionFromRole('t1', 'bad_role', 'risk.register.view', 'admin'))
      .rejects.toThrow('not found');
  });

  it('revokes permission and publishes event', async () => {
    // Role lookup
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ role_id: 'r1' }], rowCount: 1 });
    // DELETE
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await revokePermissionFromRole('t1', 'grc_admin', 'risk.register.view', 'admin');

    expect(mockPublish).toHaveBeenCalledWith('dauth.permission.revoked', 't1', expect.objectContaining({
      roleCode: 'grc_admin',
      permissionCode: 'risk.register.view',
    }));
  });

  it('executes delete query with resolved role_id', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [{ role_id: 'role-uuid' }], rowCount: 1 });
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await revokePermissionFromRole('t1', 'viewer', 'risk.register.view', 'admin');

    // Second call is the DELETE
    expect(mockSafeQuery).toHaveBeenNthCalledWith(2, expect.stringContaining('DELETE'), ['role-uuid', 'risk.register.view']);
  });
});

// ---------------------------------------------------------------------------
// getPermissionsByRole
// ---------------------------------------------------------------------------
describe('getPermissionsByRole', () => {
  it('returns mapped permissions for a role', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { permission_id: 'p1', permission_code: 'risk.register.view', name_en: 'View', name_ar: '', module_code: 'risk', is_system: false, is_active: true },
      ],
      rowCount: 1,
    });

    const result = await getPermissionsByRole('t1', 'grc_admin');
    expect(result).toHaveLength(1);
    expect(result[0].permissionCode).toBe('risk.register.view');
  });

  it('returns empty array when role has no permissions', async () => {
    const result = await getPermissionsByRole('t1', 'empty_role');
    expect(result).toEqual([]);
  });
});
