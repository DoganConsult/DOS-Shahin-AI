/**
 * Phase 2 unit tests — shift-handler registry contracts.
 *
 * The handlers themselves talk to the tenant DB so they're covered by
 * integration tests rather than unit tests. What we lock down here is:
 *
 *   • Every priority agent has a registered handler for at least its
 *     primary deliverable shift.
 *   • Handler keys match the canonical shift codes from
 *     SHAHIN_AI_EMPLOYEES (so a typo in either location surfaces in CI).
 *   • A13 has a handler (since the agent has no per-tenant tools and
 *     the lead summary is the canonical artefact).
 */
import { describe, expect, it } from 'vitest';
import { listRegisteredShiftHandlers, lookupShiftHandler } from './shift-handlers';
import { SHAHIN_AI_EMPLOYEES } from '@shahin-ai/product/shahin-ai-employees';

describe('shift-handlers registry', () => {
  it('registers handlers for the Phase 2 priority agents', () => {
    const required = [
      ['A01', 'morning_health_scan'],
      ['A02', 'mfa_morning_sweep'],
      ['A05', 'daily_evidence_sweep'],
      ['A07', 'daily_kri_pulse'],
      ['A10', 'monthly_exec_dashboard'],
      ['A13', 'daily_lead_summary'],
    ] as const;
    for (const [agentId, shiftCode] of required) {
      expect(lookupShiftHandler(agentId, shiftCode), `${agentId}:${shiftCode} handler missing`).toBeDefined();
    }
  });

  it('every registered handler key matches a canonical shift code', () => {
    for (const { agentId, shiftCode } of listRegisteredShiftHandlers()) {
      const emp = (SHAHIN_AI_EMPLOYEES as Record<string, any>)[agentId];
      expect(emp, `agent ${agentId} not in canonical registry`).toBeDefined();
      const codes = emp.schedule.map((s: any) => s.code);
      expect(codes.includes(shiftCode),
        `${agentId} has handler for ${shiftCode} but no such shift in canonical schedule (have: ${codes.join(',')})`).toBe(true);
    }
  });
});
