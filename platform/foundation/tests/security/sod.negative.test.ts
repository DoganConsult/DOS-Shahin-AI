/**
 * Negative test — SoD-violating role assignments must be blocked.
 */
import { describe, it, expect, vi } from 'vitest';
import { FOUNDATION_SOD_RULES } from '../../interface/security/foundation.sod';

// ── in-process mock harness ────────────────────────────────────────────────
const { spy } = vi.hoisted(() => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  let stub: (sql: string, params?: unknown[]) => { rows: unknown[] } = () => ({ rows: [] });
  const withTenantClient = async (tenantId: string, fn: (c: unknown) => unknown) =>
    fn({
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params: params ?? [] });
        const r = await stub(sql, params);
        return { rows: r.rows ?? [], rowCount: r.rows?.length ?? 0 };
      },
    });
  return { spy: { calls, setStub: (next: typeof stub) => { stub = next; }, withTenantClient } };
});

vi.mock('../../ports/database.port', () => ({
  withTenantClient: spy.withTenantClient,
  tenantSchema: (t: string) => `tenant_${t}`,
}));
vi.mock('../../infrastructure/observability/metrics', () => ({ userMetrics: { observeDb: vi.fn() } }));

import { checkSod } from '../../interface/http/sod-check.service';

describe('SoD — negative', () => {
  it('canonical SoD ruleset is non-empty and frozen-shaped', () => {
    expect(Array.isArray(FOUNDATION_SOD_RULES)).toBe(true);
    expect(FOUNDATION_SOD_RULES.length).toBeGreaterThan(0);
    for (const r of FOUNDATION_SOD_RULES as Array<{ ruleCode: string; conflictingRoles: [string, string]; severity: string }>) {
      expect(typeof r.ruleCode).toBe('string');
      expect(r.conflictingRoles).toHaveLength(2);
      expect(['critical', 'high', 'medium']).toContain(r.severity);
    }
  });

  it('assigning a role pair from any SoD rule is rejected with FOUNDATION_SOD_VIOLATION', async () => {
    const [rule] = FOUNDATION_SOD_RULES as Array<{
      ruleCode: string;
      conflictingRoles: [string, string];
      severity: string;
    }>;

    const [existingRole, proposedRole] = rule.conflictingRoles;

    // First query: current roles for the user → returns the existing conflicting role.
    // Second query: SoD rule lookup → returns the conflicting rule row.
    let queryCount = 0;
    spy.setStub(() => {
      queryCount++;
      if (queryCount === 1) {
        // user_role_assignments → user already has existingRole
        return { rows: [{ role_code: existingRole }] };
      }
      // sod_rules conflict query → one conflict row
      return {
        rows: [{
          rule_code: rule.ruleCode,
          conflict_a: [existingRole],
          conflict_b: [proposedRole],
          severity: rule.severity,
          description: rule.ruleCode,
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }],
      };
    });

    const decision = await checkSod('tenant-test', 'user-abc', proposedRole);

    expect(decision.has_conflicts).toBe(true);
    expect(decision.decision).toBe('BLOCKED');
    expect(decision.conflicts.length).toBeGreaterThan(0);
    expect(decision.conflicts[0].rule_id).toBe(rule.ruleCode);
  });
});
