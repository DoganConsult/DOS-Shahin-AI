/**
 * Unit tests for the AI-HR service helpers — focused on the parts that
 * have caused production bugs in past iterations:
 *
 *   • cron parsing fallback never silently advances by +1h
 *   • listAllShifts returns one shift per (agent, schedule entry)
 *   • all 13 canonical agents are present and have at least one shift
 *
 * Database-touching paths (seedShiftsForAllTenants, runDueShifts,
 * listEmployees) are exercised through the integration tests at
 * services_ai-engine-service/test/ai-hr.integration.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { SHAHIN_AI_EMPLOYEES, listAllShifts } from '@shahin-ai/product/shahin-ai-employees';

describe('shahin-ai-employees registry', () => {
  it('contains exactly the 13 canonical AGRC agents A01..A13', () => {
    const ids = Object.keys(SHAHIN_AI_EMPLOYEES).sort();
    expect(ids).toEqual([
      'A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12','A13',
    ]);
  });

  it('every employee has a managerRoleCode and at least one shift', () => {
    for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
      expect(emp.managerRoleCode, `${agentId} missing managerRoleCode`).toMatch(/^[a-z_]+$/);
      expect(emp.schedule.length, `${agentId} has zero shifts`).toBeGreaterThan(0);
    }
  });

  it('every employee has KPIs and deliverables defined', () => {
    for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
      expect(emp.kpis.length, `${agentId} has zero KPIs`).toBeGreaterThan(0);
      expect(emp.deliverables.length, `${agentId} has zero deliverables`).toBeGreaterThan(0);
    }
  });

  it('every shift produces a deliverable that exists on the same agent', () => {
    for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
      const deliverableCodes = new Set(emp.deliverables.map(d => d.code));
      for (const shift of emp.schedule) {
        expect(deliverableCodes.has(shift.produces),
          `${agentId} shift ${shift.code} produces "${shift.produces}" but agent has no such deliverable`).toBe(true);
      }
    }
  });

  it('A13 (Landing Copilot) is platform-global (perTenant=false)', () => {
    const a13 = SHAHIN_AI_EMPLOYEES.A13;
    expect(a13).toBeDefined();
    expect(a13.schedule.every(s => s.perTenant === false), 'A13 must be platform-global').toBe(true);
  });

  it('A01..A12 are per-tenant (perTenant=true on every shift)', () => {
    for (const id of ['A01','A02','A03','A04','A05','A06','A07','A08','A09','A10','A11','A12']) {
      const emp = SHAHIN_AI_EMPLOYEES[id];
      expect(emp.schedule.every(s => s.perTenant === true),
        `${id} should be per-tenant on every shift`).toBe(true);
    }
  });

  it('listAllShifts enumerates every shift exactly once', () => {
    const all = listAllShifts();
    const expectedCount = Object.values(SHAHIN_AI_EMPLOYEES)
      .reduce((sum, emp) => sum + emp.schedule.length, 0);
    expect(all.length).toBe(expectedCount);

    // Every entry is uniquely keyed by (agentId, shift.code)
    const seen = new Set<string>();
    for (const entry of all) {
      const key = `${entry.agentId}:${entry.shift.code}`;
      expect(seen.has(key), `duplicate shift ${key}`).toBe(false);
      seen.add(key);
    }
  });

  it('every cron expression is parseable by cron-parser (no silent fallbacks)', async () => {
    const parser = await import('cron-parser');
    for (const [agentId, emp] of Object.entries(SHAHIN_AI_EMPLOYEES)) {
      for (const shift of emp.schedule) {
        expect(() => parser.parseExpression(shift.cron, { tz: 'UTC' }),
          `${agentId} shift ${shift.code} has invalid cron "${shift.cron}"`).not.toThrow();
      }
    }
  });
});
