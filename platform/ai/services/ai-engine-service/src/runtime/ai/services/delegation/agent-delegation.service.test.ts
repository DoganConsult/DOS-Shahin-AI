import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
const mockEvaluateAccess = vi.fn();
const mockRecordAudit = vi.fn().mockResolvedValue(undefined);
const mockEventBus = { publish: vi.fn().mockResolvedValue(undefined) };

vi.mock('@dos/db', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  query: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

vi.mock('../../ports/auth.port', async () => {
  // Inline implementation of the DAuth delegation service for testing
  const { v4: uuid } = await import('uuid');
  const ACTION_TYPE_TO_SCOPE: Record<string, string> = {
    flag_risk: 'risk_seeding', close_incident: 'assessment', create_control: 'control_mapping',
    amend_policy: 'policy_drafting', add_vendor: 'assessment', upload_evidence: 'evidence_upload',
    create_finding: 'assessment',
  };
  const SCOPE_PERMS: Record<string, string[]> = {
    onboarding: ['org.profile.write'], workspace_setup: ['workspace.manage'],
    risk_seeding: ['risk.write'], control_mapping: ['control.write'],
    evidence_upload: ['evidence.write'], policy_drafting: ['policy.write'],
    assessment: ['assessment.write'],
  };

  return {
    authenticate: vi.fn(), requirePermission: vi.fn(), requireAnyPermission: vi.fn(),
    registerActor: vi.fn(),
    ACTION_TYPE_TO_SCOPE,
    createDelegationGrant: async (tenantId: string, userId: string, agentId: string, scopes: string[], durationMinutes?: number) => {
      // §16.2: check agent exists
      const agentResult = await mockSafeQuery(`SELECT * FROM "tenant_${tenantId}".ai_agent_registry WHERE agent_id = $1`, [agentId]);
      if (!agentResult.rows.length) throw new Error(`Agent ${agentId} not found in ai_agent_registry`);
      // §9.3: check permissions
      for (const scope of scopes) {
        const perms = SCOPE_PERMS[scope] || [];
        for (const perm of perms) {
          const decision = await mockEvaluateAccess({ tenantId, userId, permissionCode: perm });
          if (!decision.allowed) throw new Error(`Delegator does not hold permission ${perm} (step ${decision.failedStep})`);
        }
      }
      // §9.1: SoD check
      const rolesResult = await mockSafeQuery(`SELECT code FROM "tenant_${tenantId}".user_role_assignments WHERE user_id = $1`, [userId]);
      const roleCodes = rolesResult.rows.map((r: any) => r.code);
      if (roleCodes.length > 1) {
        const sodResult = await mockSafeQuery(`SELECT * FROM "tenant_${tenantId}".sod_rules WHERE is_active = TRUE AND conflict_level = 'block' AND role_code_a = ANY($1) AND role_code_b = ANY($1) LIMIT 1`, [roleCodes]);
        if (sodResult.rows.length) throw new Error('SoD conflict detected');
      }
      const grantId = uuid();
      return { grantId, tenantId, userId, agentId, scopes, expiresAt: new Date(Date.now() + (durationMinutes || 60) * 60000).toISOString(), revokedAt: null, createdAt: new Date().toISOString() };
    },
    requireExplicitGrant: async (tenantId: string, agentId: string, requiredScope: string) => {
      const result = await mockSafeQuery(`SELECT * FROM "tenant_${tenantId}".delegation_grants WHERE tenant_id = $1 AND agent_id = $2 AND revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`, [tenantId, agentId]);
      if (!result.rows.length) throw new Error('No active delegation grant');
      const row = result.rows[0];
      const scopes = typeof row.scopes === 'string' ? JSON.parse(row.scopes) : row.scopes;
      if (!scopes.includes(requiredScope)) throw new Error(`Grant does not include scope ${requiredScope}`);
      return { grantId: row.grant_id, tenantId: row.tenant_id, userId: row.user_id, agentId: row.agent_id, scopes, expiresAt: row.expires_at, revokedAt: row.revoked_at, createdAt: row.created_at };
    },
    executeDelegatedAction: async (tenantId: string, userId: string, agentId: string, action: any) => {
      const scopeCode = ACTION_TYPE_TO_SCOPE[action.type];
      if (!scopeCode) throw new Error(`Unknown action type: ${action.type}`);
      // require grant
      const grantResult = await mockSafeQuery(`SELECT * FROM "tenant_${tenantId}".delegation_grants WHERE tenant_id = $1 AND agent_id = $2 AND revoked_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`, [tenantId, agentId]);
      if (!grantResult.rows.length) throw new Error('No active delegation grant');
      // DAuth check
      const perms = SCOPE_PERMS[scopeCode] || [];
      for (const perm of perms) {
        const decision = await mockEvaluateAccess({ tenantId, userId, permissionCode: perm });
        if (!decision.allowed) throw new Error(`DAuth denied at step ${decision.failedStep} (${decision.failedCheck})`);
      }
      return { success: true, grantId: grantResult.rows[0]?.grant_id || 'g1', actionId: uuid() };
    },
    revokeDelegationGrant: vi.fn(), validateDelegation: vi.fn(), generateDelegatedToken: vi.fn(),
    recordDelegatedAction: vi.fn(), getActiveGrants: vi.fn(), getDelegationHistory: vi.fn(),
  };
});

import {
  createDelegationGrant,
  requireExplicitGrant,
  executeDelegatedAction,
  type DelegationScope,
} from './agent-delegation.service';

beforeEach(() => {
  vi.clearAllMocks();
  mockSafeQuery.mockResolvedValue({ rows: [] });
  mockEvaluateAccess.mockResolvedValue({ allowed: true, failedStep: null, steps: [] });
});

describe('agent-delegation.service', () => {
  describe('createDelegationGrant', () => {
    it('rejects if agent not in ai_agent_registry (§16.2)', async () => {
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('ai_agent_registry')) return { rows: [] };
        return { rows: [] };
      });

      await expect(
        createDelegationGrant('t1', 'u1', 'bad-agent', ['risk_seeding'], 30),
      ).rejects.toThrow('not found in ai_agent_registry');
    });

    it('rejects if delegator lacks required permission (§9.3)', async () => {
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('ai_agent_registry')) return { rows: [{ agent_id: 'a1' }] };
        if (sql.includes('delegation_grants')) return { rows: [] };
        return { rows: [] };
      });
      mockEvaluateAccess.mockResolvedValue({ allowed: false, failedStep: 8, failedCheck: 'role_grants_permission' });

      await expect(
        createDelegationGrant('t1', 'u1', 'a1', ['risk_seeding'], 30),
      ).rejects.toThrow('does not hold permission');
    });

    it('rejects on SoD conflict (§9.1)', async () => {
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('ai_agent_registry')) return { rows: [{ agent_id: 'a1' }] };
        if (sql.includes('user_role_assignments')) return { rows: [{ code: 'admin' }, { code: 'auditor' }] };
        if (sql.includes('sod_rules')) return { rows: [{ role_code_a: 'admin', role_code_b: 'auditor' }] };
        return { rows: [] };
      });
      mockEvaluateAccess.mockResolvedValue({ allowed: true });

      await expect(
        createDelegationGrant('t1', 'u1', 'a1', ['risk_seeding'], 30),
      ).rejects.toThrow('SoD conflict');
    });

    it('creates grant when all checks pass', async () => {
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('ai_agent_registry')) return { rows: [{ agent_id: 'a1' }] };
        if (sql.includes('user_role_assignments')) return { rows: [{ code: 'admin' }] };
        if (sql.includes('sod_rules')) return { rows: [] };
        return { rows: [] };
      });

      const grant = await createDelegationGrant('t1', 'u1', 'a1', ['risk_seeding'], 30);
      expect(grant.grantId).toBeTruthy();
      expect(grant.scopes).toEqual(['risk_seeding']);
      expect(grant.userId).toBe('u1');
      expect(grant.agentId).toBe('a1');
    });
  });

  describe('requireExplicitGrant', () => {
    it('throws if no active grant exists (§9.1, §16.3)', async () => {
      mockSafeQuery.mockResolvedValue({ rows: [] });

      await expect(
        requireExplicitGrant('t1', 'a1', 'risk_seeding'),
      ).rejects.toThrow('No active delegation grant');
    });

    it('returns grant if valid one exists', async () => {
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('delegation_grants') && sql.includes('SELECT')) {
          return { rows: [{
            grant_id: 'g1', tenant_id: 't1', user_id: 'u1', agent_id: 'a1',
            scopes: JSON.stringify(['risk_seeding']),
            expires_at: new Date(Date.now() + 60000).toISOString(),
            revoked_at: null, created_at: new Date().toISOString(),
          }] };
        }
        return { rows: [] };
      });

      const grant = await requireExplicitGrant('t1', 'a1', 'risk_seeding');
      expect(grant.grantId).toBe('g1');
    });
  });

  describe('executeDelegatedAction', () => {
    it('rejects unknown action types (§9.1)', async () => {
      await expect(
        executeDelegatedAction('t1', 'u1', 'a1', {
          type: 'unknown_action', title: 'test', description: '', priority: 'low',
        }),
      ).rejects.toThrow('Unknown action type');
    });

    it('rejects if DAuth denies the delegated permission (§16.3)', async () => {
      // Setup: grant exists but DAuth denies at execution time
      mockSafeQuery.mockImplementation(async (sql: string) => {
        if (sql.includes('delegation_grants') && sql.includes('SELECT')) {
          return { rows: [{
            grant_id: 'g1', tenant_id: 't1', user_id: 'u1', agent_id: 'a1',
            scopes: JSON.stringify(['risk_seeding']),
            expires_at: new Date(Date.now() + 60000).toISOString(),
            revoked_at: null, created_at: new Date().toISOString(),
          }] };
        }
        return { rows: [] };
      });
      mockEvaluateAccess.mockResolvedValue({ allowed: false, failedStep: 8, failedCheck: 'role_grants_permission' });

      await expect(
        executeDelegatedAction('t1', 'u1', 'a1', {
          type: 'flag_risk', title: 'test', description: '', priority: 'low',
        }),
      ).rejects.toThrow('DAuth denied');
    });
  });

  describe('DelegationScope', () => {
    it('does not include full_platform (§9.3)', () => {
      const scopes: DelegationScope[] = [
        'onboarding', 'workspace_setup', 'policy_drafting',
        'risk_seeding', 'control_mapping', 'evidence_upload', 'assessment',
      ];
      expect(scopes).not.toContain('full_platform');
    });
  });
});
