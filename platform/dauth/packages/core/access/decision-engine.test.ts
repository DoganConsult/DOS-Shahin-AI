import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up DB mock before importing the engine
const mockSafeQuery = vi.fn();
const mockQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  tenantSchema: (tenantId: string) => `tenant_${tenantId}`,
}));

import { evaluateAccess, invalidatePermissionCache, type AccessDecisionContext } from './decision-engine';

function baseCtx(overrides: Partial<AccessDecisionContext> = {}): AccessDecisionContext {
  return {
    userId: 'u-001',
    tenantId: 't-001',
    role: 'admin',
    roles: ['admin'],
    permissionCode: 'risk.record.read',
    ...overrides,
  };
}

function defaultQueryHandler(sql: string): { rows: unknown[] } {
  if (sql.includes('tenant_user_memberships')) return { rows: [{ status: 'active' }] };
  if (sql.includes('public.tenants')) return { rows: [{ status: 'active' }] };
  if (sql.includes('tenant_module_entitlements')) return { rows: [{ is_active: true }] };
  if (sql.includes('module_workflow_registry')) return { rows: [{ licensed: true }] };
  if (sql.includes('user_access_profiles')) return { rows: [] };
  if (sql.includes('role_permission_map')) return { rows: [{ role_code: 'admin', permission_code: 'risk.record.read' }] };
  if (sql.includes('sod_rules')) return { rows: [] };
  if (sql.includes('user_role_assignments') && sql.includes('scope_type')) return { rows: [{ id: 1 }] };
  if (sql.includes('authority_levels') && sql.includes('user_role_assignments')) return { rows: [{ rank: 5 }] };
  if (sql.includes('authority_levels') && !sql.includes('user_role_assignments')) return { rows: [{ rank: 3 }] };
  if (sql.includes('module_lifecycle_transitions')) return { rows: [{ id: 1 }] };
  if (sql.includes('delegations')) return { rows: [] };
  if (sql.includes('authz_decision_log')) return { rows: [] };
  return { rows: [] };
}

beforeEach(() => {
  vi.clearAllMocks();
  invalidatePermissionCache();
  mockSafeQuery.mockImplementation(async (sql: string) => defaultQueryHandler(sql));
  mockQuery.mockImplementation(async (sql: string) => defaultQueryHandler(sql));
});

describe('DAuth Decision Engine — 14-step pipeline', () => {
  it('step 1: denies when no userId', async () => {
    const d = await evaluateAccess(baseCtx({ userId: '' }));
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(1);
    expect(d.failedCheck).toBe('actor_authenticated');
  });

  it('step 2: session valid (enforced by middleware)', async () => {
    const d = await evaluateAccess(baseCtx());
    expect(d.steps[1].name).toBe('session_valid');
    expect(d.steps[1].passed).toBe(true);
  });

  it('step 3: denies when no active tenant membership', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('tenant_user_memberships')) return { rows: [] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx());
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(3);
    expect(d.failedCheck).toBe('tenant_membership_valid');
  });

  it('step 4: denies when tenant suspended', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('public.tenants')) return { rows: [{ status: 'suspended' }] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx());
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(4);
    expect(d.failedCheck).toBe('tenant_active');
  });

  it('step 4: allows trial_active tenants', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('public.tenants')) return { rows: [{ status: 'trial_active' }] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx());
    expect(d.steps[3].passed).toBe(true);
  });

  it('step 5: denies when module not entitled', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('tenant_module_entitlements')) return { rows: [] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx({ permissionCode: 'custom_module.record.read' }));
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(5);
    expect(d.failedCheck).toBe('product_enabled');
  });

  it('step 5: allows always-on modules without entitlement', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('tenant_module_entitlements')) return { rows: [] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx({ permissionCode: 'admin.config.read' }));
    expect(d.steps[4].passed).toBe(true);
    expect(d.steps[4].detail).toContain('Always-on');
  });

  it('step 6: denies when module disabled (non-GRC module)', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('module_workflow_registry')) return { rows: [{ licensed: false }] };
      if (sql.includes('role_permission_map')) return { rows: [{ role_code: 'admin', permission_code: 'custom_module.record.read' }] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx({ permissionCode: 'custom_module.record.read' }));
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(6);
    expect(d.failedCheck).toBe('module_enabled');
  });

  it('step 7: denies when access profile is blocked', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('user_access_profiles')) return { rows: [{ code: 'suspended' }] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx());
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(7);
    expect(d.failedCheck).toBe('access_profile_allows');
  });

  it('step 7: allows when no access profile assigned', async () => {
    const d = await evaluateAccess(baseCtx());
    expect(d.steps[6].passed).toBe(true);
    expect(d.steps[6].detail).toContain('No profile assigned');
  });

  it('step 8: denies when no role grants permission', async () => {
    const customHandler = async (sql: string) => {
      if (sql.includes('role_permission_map')) return { rows: [{ role_code: 'auditor', permission_code: 'audit.finding.read' }] };
      return defaultQueryHandler(sql);
    };
    mockSafeQuery.mockImplementation(customHandler);
    mockQuery.mockImplementation(customHandler);
    const d = await evaluateAccess(baseCtx());
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(8);
    expect(d.failedCheck).toBe('role_grants_permission');
  });

  it('step 8: super-admin bypasses permission check', async () => {
    const customHandler = async (sql: string) => {
      if (sql.includes('role_permission_map')) return { rows: [] };
      return defaultQueryHandler(sql);
    };
    mockSafeQuery.mockImplementation(customHandler);
    mockQuery.mockImplementation(customHandler);
    const d = await evaluateAccess(baseCtx({ isSuperAdmin: true }));
    expect(d.steps[7].passed).toBe(true);
    expect(d.steps[7].detail).toBe('Super-admin bypass');
  });

  it('step 5: GRC core module allowed when entitlements table is empty', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('tenant_module_entitlements')) return { rows: [] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx({ permissionCode: 'risk.record.read' }));
    expect(d.steps[4].passed).toBe(true);
    expect(d.steps[4].detail).toContain('GRC core fallback');
  });

  it('step 5: GRC core module denied when other entitlements exist but module not entitled', async () => {
    let _callCount = 0;
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('tenant_module_entitlements')) {
        callCount++;
        if (sql.includes('module_code')) return { rows: [] };
        return { rows: [{ id: 1 }] };
      }
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx({ permissionCode: 'risk.record.read' }));
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(5);
  });

  it('step 8: reads permissions from role_permission_map', async () => {
    const customHandler = async (sql: string) => {
      if (sql.includes('role_permission_map')) return { rows: [{ role_code: 'admin', permission_code: 'risk.record.read' }] };
      return defaultQueryHandler(sql);
    };
    mockSafeQuery.mockImplementation(customHandler);
    mockQuery.mockImplementation(customHandler);
    const d = await evaluateAccess(baseCtx());
    expect(d.steps[7].passed).toBe(true);
    expect(d.steps[7].detail).toContain('Granted via role: admin');
  });

  it('step 11: denies when SoD blocking conflict', async () => {
    mockSafeQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('sod_rules')) return { rows: [{ role_code_a: 'admin', role_code_b: 'auditor', conflict_level: 'block' }] };
      return defaultQueryHandler(sql);
    });
    const d = await evaluateAccess(baseCtx({ roles: ['admin', 'auditor'] }));
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(11);
    expect(d.failedCheck).toBe('sod_passes');
  });

  it('step 11: passes with single role', async () => {
    const d = await evaluateAccess(baseCtx({ roles: ['admin'] }));
    expect(d.steps[10].passed).toBe(true);
    expect(d.steps[10].detail).toContain('Single role');
  });

  it('all 14 steps pass → allowed', async () => {
    const d = await evaluateAccess(baseCtx());
    expect(d.allowed).toBe(true);
    expect(d.failedStep).toBeNull();
    expect(d.steps).toHaveLength(14);
    for (const s of d.steps) {
      expect(s.passed).toBe(true);
    }
  });

  it('returns all 14 step names in correct order', async () => {
    const d = await evaluateAccess(baseCtx());
    expect(d.steps.map(s => s.name)).toEqual([
      'actor_authenticated',
      'session_valid',
      'tenant_membership_valid',
      'tenant_active',
      'product_enabled',
      'module_enabled',
      'access_profile_allows',
      'role_grants_permission',
      'scope_matches',
      'authority_sufficient',
      'sod_passes',
      'lifecycle_transition_allowed',
      'delegation_ownership_pass',
      'decision_logged',
    ]);
  });

  it('logs decision to authz_decision_log', async () => {
    await evaluateAccess(baseCtx());
    const logCalls = mockSafeQuery.mock.calls.filter(
      (c: unknown[]) => typeof c[0] === 'string' && c[0].includes('authz_decision_log'),
    );
    expect(logCalls.length).toBeGreaterThanOrEqual(1);
    expect(logCalls[0][0]).toContain('INSERT INTO');
  });

  it('non-super-admin happy path: standard_user can access a canonical permission via role_permission_map', async () => {
    const customHandler = async (sql: string) => {
      if (sql.includes('role_permission_map')) return { rows: [
        { role_code: 'standard_user', permission_code: 'risk.record.read' },
        { role_code: 'standard_user', permission_code: 'workspace.config.read' },
      ]};
      return defaultQueryHandler(sql);
    };
    mockSafeQuery.mockImplementation(customHandler);
    mockQuery.mockImplementation(customHandler);
    const d = await evaluateAccess(baseCtx({
      role: 'standard_user',
      roles: ['standard_user'],
      permissionCode: 'risk.record.read',
      isSuperAdmin: false,
    }));
    expect(d.allowed).toBe(true);
    expect(d.steps[7].passed).toBe(true);
    expect(d.steps[7].detail).toContain('standard_user');
  });

  it('non-super-admin denied when role_permission_map returns zero rows', async () => {
    const customHandler = async (sql: string) => {
      if (sql.includes('role_permission_map')) return { rows: [] };
      return defaultQueryHandler(sql);
    };
    mockSafeQuery.mockImplementation(customHandler);
    mockQuery.mockImplementation(customHandler);
    const d = await evaluateAccess(baseCtx({ isSuperAdmin: false }));
    expect(d.allowed).toBe(false);
    expect(d.failedStep).toBe(8);
    expect(d.failedCheck).toBe('role_grants_permission');
  });

  it('seed-to-read: role_permission_map serves as sole permission source', async () => {
    const customHandler = async (sql: string) => {
      if (sql.includes('role_permission_map')) return { rows: [
        { role_code: 'admin', permission_code: 'risk.record.read' },
        { role_code: 'compliance_officer', permission_code: 'compliance.control.read' },
      ]};
      return defaultQueryHandler(sql);
    };
    mockSafeQuery.mockImplementation(customHandler);
    mockQuery.mockImplementation(customHandler);
    const d1 = await evaluateAccess(baseCtx({ role: 'admin', roles: ['admin'], permissionCode: 'risk.record.read' }));
    expect(d1.allowed).toBe(true);
    invalidatePermissionCache();
    const d2 = await evaluateAccess(baseCtx({ role: 'compliance_officer', roles: ['compliance_officer'], permissionCode: 'compliance.control.read' }));
    expect(d2.allowed).toBe(true);
  });
});
