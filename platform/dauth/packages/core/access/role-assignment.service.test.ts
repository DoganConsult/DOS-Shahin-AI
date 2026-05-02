/**
 * Role Assignment Service — DAuth role assignment lifecycle tests
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
  assignRole,
  revokeRole,
  getUserRoleAssignments,
  getRoleAssignmentsByRole,
  expireStaleAssignments,
} from './role-assignment.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ---------------------------------------------------------------------------
// assignRole
// ---------------------------------------------------------------------------
describe('assignRole', () => {
  it('creates an assignment and publishes event', async () => {
    const fakeDate = new Date('2026-03-29T12:00:00Z');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ assignment_id: 'a1', valid_from: fakeDate }],
      rowCount: 1,
    });

    const result = await assignRole('t1', 'user-1', 'risk_analyst', { assignedBy: 'admin' });

    expect(result.assignmentId).toBe('a1');
    expect(result.userId).toBe('user-1');
    expect(result.roleCode).toBe('risk_analyst');
    expect(result.isActive).toBe(true);
    expect(result.validFrom).toBe(fakeDate.toISOString());
    expect(result.validTo).toBeNull();
    expect(mockPublish).toHaveBeenCalledWith('dauth.role.assigned', 't1', expect.objectContaining({
      userId: 'user-1',
      roleCode: 'risk_analyst',
    }));
  });

  it('passes optional scope and module fields', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ assignment_id: 'a2', valid_from: new Date() }],
      rowCount: 1,
    });

    const result = await assignRole('t1', 'user-1', 'auditor', {
      moduleCode: 'audit',
      scopeType: 'department',
      scopeId: 'dept-1',
      validTo: '2027-01-01',
      assignedBy: 'admin',
    });

    expect(result.moduleCode).toBe('audit');
    expect(result.scopeType).toBe('department');
    expect(result.scopeId).toBe('dept-1');
    expect(result.validTo).toBe('2027-01-01');
    // Verify params passed to query
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO'),
      ['user-1', 'auditor', 'audit', 'department', 'dept-1', '2027-01-01', 'admin'],
    );
  });

  it('defaults optional fields to null when not provided', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [{ assignment_id: 'a3', valid_from: new Date() }],
      rowCount: 1,
    });

    await assignRole('t1', 'user-1', 'viewer', { assignedBy: 'admin' });

    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.any(String),
      ['user-1', 'viewer', null, null, null, null, 'admin'],
    );
  });
});

// ---------------------------------------------------------------------------
// revokeRole
// ---------------------------------------------------------------------------
describe('revokeRole', () => {
  it('returns true and publishes event when role is revoked', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await revokeRole('t1', 'user-1', 'risk_analyst', 'admin');
    expect(result).toBe(true);
    expect(mockPublish).toHaveBeenCalledWith('dauth.role.revoked', 't1', expect.objectContaining({
      userId: 'user-1',
      roleCode: 'risk_analyst',
    }));
  });

  it('returns false when no active assignment exists', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await revokeRole('t1', 'user-1', 'nonexistent_role', 'admin');
    expect(result).toBe(false);
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('only revokes active assignments (SQL includes is_active = TRUE)', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await revokeRole('t1', 'user-1', 'viewer', 'admin');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_active = TRUE'),
      ['user-1', 'viewer'],
    );
  });

  it('sets valid_to to NOW() on revocation', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await revokeRole('t1', 'u1', 'r1', 'admin');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('valid_to = NOW()'),
      expect.any(Array),
    );
  });
});

// ---------------------------------------------------------------------------
// getUserRoleAssignments
// ---------------------------------------------------------------------------
describe('getUserRoleAssignments', () => {
  it('returns mapped assignments for a user', async () => {
    const fakeFrom = new Date('2026-01-01');
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        {
          assignment_id: 'a1',
          user_id: 'user-1',
          role_code: 'risk_analyst',
          module_code: 'risk',
          scope_type: 'department',
          scope_id: 'dept-1',
          is_active: true,
          valid_from: fakeFrom,
          valid_to: null,
          created_by: 'admin',
        },
      ],
      rowCount: 1,
    });

    const result = await getUserRoleAssignments('t1', 'user-1');
    expect(result).toHaveLength(1);
    expect(result[0].assignmentId).toBe('a1');
    expect(result[0].roleCode).toBe('risk_analyst');
    expect(result[0].assignedBy).toBe('admin');
    expect(result[0].validTo).toBeNull();
  });

  it('returns empty array when user has no assignments', async () => {
    const result = await getUserRoleAssignments('t1', 'new_user');
    expect(result).toEqual([]);
  });

  it('excludes expired assignments (SQL includes valid_to check)', async () => {
    await getUserRoleAssignments('t1', 'user-1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('valid_to IS NULL OR valid_to > NOW()'),
      ['user-1'],
    );
  });

  it('handles rows with missing created_by gracefully', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { assignment_id: 'a1', user_id: 'u1', role_code: 'r1', module_code: null, scope_type: null, scope_id: null, is_active: true, valid_from: null, valid_to: null, created_by: null },
      ],
      rowCount: 1,
    });

    const result = await getUserRoleAssignments('t1', 'u1');
    expect(result[0].assignedBy).toBe('');
    expect(result[0].validFrom).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getRoleAssignmentsByRole
// ---------------------------------------------------------------------------
describe('getRoleAssignmentsByRole', () => {
  it('returns assignments for a specific role code', async () => {
    mockSafeQuery.mockResolvedValueOnce({
      rows: [
        { assignment_id: 'a1', user_id: 'u1', role_code: 'grc_admin', module_code: null, scope_type: null, scope_id: null, is_active: true, valid_from: new Date(), valid_to: null, created_by: 'admin' },
        { assignment_id: 'a2', user_id: 'u2', role_code: 'grc_admin', module_code: null, scope_type: null, scope_id: null, is_active: true, valid_from: new Date(), valid_to: null, created_by: 'admin' },
      ],
      rowCount: 2,
    });

    const result = await getRoleAssignmentsByRole('t1', 'grc_admin');
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('u1');
    expect(result[1].userId).toBe('u2');
  });

  it('returns empty array when no users have this role', async () => {
    const result = await getRoleAssignmentsByRole('t1', 'unused_role');
    expect(result).toEqual([]);
  });

  it('queries by role_code parameter', async () => {
    await getRoleAssignmentsByRole('t1', 'auditor');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('role_code = $1'),
      ['auditor'],
    );
  });

  it('orders results by user_id', async () => {
    await getRoleAssignmentsByRole('t1', 'viewer');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY user_id'),
      expect.any(Array),
    );
  });
});

// ---------------------------------------------------------------------------
// expireStaleAssignments
// ---------------------------------------------------------------------------
describe('expireStaleAssignments', () => {
  it('returns count of expired assignments', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 5 });

    const count = await expireStaleAssignments('t1');
    expect(count).toBe(5);
  });

  it('returns 0 when nothing to expire', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const count = await expireStaleAssignments('t1');
    expect(count).toBe(0);
  });

  it('handles null rowCount gracefully', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: null });

    const count = await expireStaleAssignments('t1');
    expect(count).toBe(0);
  });

  it('targets only active assignments past their valid_to', async () => {
    mockSafeQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expireStaleAssignments('t1');
    expect(mockSafeQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_active = TRUE AND valid_to IS NOT NULL AND valid_to < NOW()'),
      [],
    );
  });
});
