import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSafeQuery = vi.fn();
vi.mock('../../../config/database', () => ({
  safeQuery: (...args: unknown[]) => mockSafeQuery(...args),
  tenantSchema: (t: string) => `tenant_${t}`,
}));

import {
  evaluateSod,
  evaluateModuleSod,
  evaluateModuleSodFromDefinitions,
  preventSelfApproval,
} from './sod-engine';

beforeEach(() => { vi.clearAllMocks(); mockSafeQuery.mockResolvedValue({ rows: [] }); });

describe('DAuth SodEngine', () => {
  // ── Enterprise SoD (role-pair) ──────────────────────────────────────────

  it('passes with single role', async () => {
    const r = await evaluateSod('t1', ['admin']);
    expect(r.passed).toBe(true);
    expect(r.outcome).toBe('allow');
  });

  it('blocks when sod_rules has blocking conflict', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [{ role_code_a: 'admin', role_code_b: 'auditor', conflict_level: 'block', description: 'test' }] });
    const r = await evaluateSod('t1', ['admin', 'auditor']);
    expect(r.passed).toBe(false);
    expect(r.outcome).toBe('block');
    expect(r.violations).toHaveLength(1);
  });

  it('warns on warn-level conflict', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [{ role_code_a: 'a', role_code_b: 'b', conflict_level: 'warn' }] });
    const r = await evaluateSod('t1', ['a', 'b']);
    expect(r.passed).toBe(true);
    expect(r.outcome).toBe('warn');
  });

  it('escalates on escalate-level conflict', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [{ role_code_a: 'a', role_code_b: 'b', conflict_level: 'escalate' }] });
    const r = await evaluateSod('t1', ['a', 'b']);
    expect(r.passed).toBe(false);
    expect(r.outcome).toBe('escalate');
  });

  it('filters by moduleCode when provided', async () => {
    mockSafeQuery.mockResolvedValue({ rows: [] });
    await evaluateSod('t1', ['a', 'b'], { moduleCode: 'risk' });
    const sql = mockSafeQuery.mock.calls[0][0] as string;
    expect(sql).toContain('module_code');
    expect(mockSafeQuery.mock.calls[0][1]).toContain('risk');
  });

  // ── Module SoD (action-pair from DB) ────────────────────────────────────

  it('evaluateModuleSod passes with fewer than 2 actions', async () => {
    const r = await evaluateModuleSod('t1', 'risk', ['create_risk']);
    expect(r.passed).toBe(true);
    expect(r.outcome).toBe('allow');
    expect(r.moduleViolations).toEqual([]);
  });

  it('evaluateModuleSod blocks on hard conflict with block strategy', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        action_a: 'create_risk', action_b: 'approve_risk',
        conflict_type: 'hard', resolution_strategy: 'block',
        module_code: 'risk', description_en: 'Cannot create and approve same risk',
      }],
    });
    const r = await evaluateModuleSod('t1', 'risk', ['create_risk', 'approve_risk']);
    expect(r.passed).toBe(false);
    expect(r.outcome).toBe('block');
    expect(r.moduleViolations).toHaveLength(1);
    expect(r.moduleViolations![0].conflictType).toBe('hard');
  });

  it('evaluateModuleSod warns on soft conflict with warn strategy', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        action_a: 'view_risk', action_b: 'edit_risk',
        conflict_type: 'soft', resolution_strategy: 'warn',
        module_code: 'risk', description_en: 'Soft conflict',
      }],
    });
    const r = await evaluateModuleSod('t1', 'risk', ['view_risk', 'edit_risk']);
    expect(r.passed).toBe(true);
    expect(r.outcome).toBe('warn');
  });

  it('evaluateModuleSod defaults strategy from conflict_type when resolution_strategy is null', async () => {
    mockSafeQuery.mockResolvedValue({
      rows: [{
        action_a: 'create_risk', action_b: 'approve_risk',
        conflict_type: 'hard', resolution_strategy: null,
        module_code: 'risk', description_en: null,
      }],
    });
    const r = await evaluateModuleSod('t1', 'risk', ['create_risk', 'approve_risk']);
    expect(r.passed).toBe(false);
    expect(r.outcome).toBe('block');
    expect(r.moduleViolations![0].resolutionStrategy).toBe('block');
  });

  // ── Module SoD from external definitions ────────────────────────────────

  it('evaluateModuleSodFromDefinitions detects conflicts from input definitions', () => {
    const defs = [
      { moduleCode: 'compliance', actionA: 'create_finding', actionB: 'close_finding', conflictType: 'hard' as const, resolutionStrategy: 'escalate' as const, description: 'test' },
    ];
    const r = evaluateModuleSodFromDefinitions(defs, ['create_finding', 'close_finding']);
    expect(r.passed).toBe(false);
    expect(r.outcome).toBe('escalate');
    expect(r.moduleViolations).toHaveLength(1);
  });

  it('evaluateModuleSodFromDefinitions passes when no action overlap', () => {
    const defs = [
      { moduleCode: 'compliance', actionA: 'create_finding', actionB: 'close_finding', conflictType: 'hard' as const, resolutionStrategy: 'block' as const },
    ];
    const r = evaluateModuleSodFromDefinitions(defs, ['create_finding', 'view_finding']);
    expect(r.passed).toBe(true);
    expect(r.outcome).toBe('allow');
  });

  it('evaluateModuleSodFromDefinitions passes with empty definitions', () => {
    const r = evaluateModuleSodFromDefinitions([], ['a', 'b']);
    expect(r.passed).toBe(true);
  });

  // ── Self-approval prevention ────────────────────────────────────────────

  it('preventSelfApproval blocks same user', () => {
    expect(preventSelfApproval('u1', 'u1').allowed).toBe(false);
  });

  it('preventSelfApproval allows different users', () => {
    expect(preventSelfApproval('u1', 'u2').allowed).toBe(true);
  });
});
