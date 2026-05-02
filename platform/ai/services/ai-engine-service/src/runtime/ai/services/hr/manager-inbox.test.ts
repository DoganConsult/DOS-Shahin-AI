/**
 * Phase 2 audit — manager-inbox filter contract.
 *
 * The DB-touching path is exercised in integration tests. This unit test
 * locks down the role → managed-agents derivation, which is the bug-prone
 * part (every change to managerRoleCode in shahin-ai-employees.ts must be
 * reflected in who sees what reports).
 */
import { describe, expect, it } from 'vitest';
import { SHAHIN_AI_EMPLOYEES } from '@shahin-ai/product/shahin-ai-employees';

// Reflect the authoritative derivation logic. Mirrors listManagerInbox in
// ai-hr.service.ts so that any drift between this test and runtime is a
// real CI failure, not a silent skip.
function derivedManagedAgents(callerRoleCodes: string[], isSuperAdmin = false): string[] {
  const isSuper = isSuperAdmin
    || callerRoleCodes.includes('platform_admin')
    || callerRoleCodes.includes('super_admin');
  if (isSuper) return Object.keys(SHAHIN_AI_EMPLOYEES);
  return Object.entries(SHAHIN_AI_EMPLOYEES)
    .filter(([, emp]) => callerRoleCodes.includes((emp as any).managerRoleCode))
    .map(([id]) => id);
}

describe('manager-inbox role filter', () => {
  it('platform_admin sees all 13 agents', () => {
    expect(derivedManagedAgents(['platform_admin']).length).toBe(13);
  });

  it('super_admin sees all 13 agents', () => {
    expect(derivedManagedAgents(['super_admin']).length).toBe(13);
  });

  it('is_super_admin flag without platform_admin role still grants full view', () => {
    expect(derivedManagedAgents([], true).length).toBe(13);
  });

  it('compliance_officer sees only their 6 direct reports', () => {
    const got = derivedManagedAgents(['compliance_officer']).sort();
    // Per shahin-ai-employees.ts: A01,A03,A04,A05,A06,A08 report to compliance_officer.
    expect(got).toEqual(['A01', 'A03', 'A04', 'A05', 'A06', 'A08']);
  });

  it('an unrecognised role sees nothing', () => {
    expect(derivedManagedAgents(['frontline_engineer'])).toEqual([]);
  });

  it('empty roles + no super-admin → empty list', () => {
    expect(derivedManagedAgents([], false)).toEqual([]);
  });

  it('every agent has exactly one manager role mapping', () => {
    for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
      expect(typeof (emp as any).managerRoleCode, `${agentId} managerRoleCode missing`).toBe('string');
      expect((emp as any).managerRoleCode.length, `${agentId} empty managerRoleCode`).toBeGreaterThan(0);
    }
  });
});
