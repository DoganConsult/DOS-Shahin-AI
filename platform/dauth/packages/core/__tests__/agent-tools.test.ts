import { describe, expect, it } from 'vitest';
import { buildDAuthAgentTools } from '../agent-tools';
import { createDAuthPort } from '../dauth-port.impl';
import type { DAuthPort } from '@dos/ports/dauth';

function stubPort(overrides: Partial<DAuthPort> = {}): DAuthPort {
  return createDAuthPort({
    validateSession: async () => null,
    checkAccess: async () => ({
      decision: 'allow',
      decisionId: 'd-agent',
      reasonCodes: ['ROLE_ADMIN'],
      evaluatedAt: '2026-04-22T00:00:00Z',
    }),
    checkAuthority: async () => true,
    getActiveDelegations: async () => [],
    evaluateSoD: async (_, grants) => ({
      conflict: grants.length > 1,
      ruleCodes: grants.length > 1 ? ['SOD_CONFLICT'] : [],
    }),
    revokeSession: async () => false,
    ...overrides,
  });
}

describe('buildDAuthAgentTools', () => {
  it('exposes exactly three tools with unique names', () => {
    const tools = buildDAuthAgentTools({ port: stubPort() });
    expect(tools.map((t) => t.name).sort()).toEqual([
      'dauth.check_access',
      'dauth.check_authority',
      'dauth.evaluate_sod',
    ]);
  });

  it('dauth.check_access forwards principal + action + resource to DAuthPort.checkAccess', async () => {
    const tools = buildDAuthAgentTools({ port: stubPort() });
    const tool = tools.find((t) => t.name === 'dauth.check_access')!;
    const out = await tool.handler('t-1', {
      userId: 'u-1',
      roles: ['admin'],
      action: 'risk.read',
      resourceType: 'risk',
      resourceId: 'r-42',
    });
    expect((out as any).decision).toBe('allow');
    expect((out as any).decisionId).toBe('d-agent');
  });

  it('dauth.check_authority returns { holds: boolean }', async () => {
    const tools = buildDAuthAgentTools({ port: stubPort({ checkAuthority: async () => false }) });
    const tool = tools.find((t) => t.name === 'dauth.check_authority')!;
    const out = await tool.handler('t-1', {
      userId: 'u-1',
      authorityCode: 'APPROVE_RISK_ACCEPTANCE',
    });
    expect((out as any).holds).toBe(false);
  });

  it('dauth.evaluate_sod flags a conflict when 2+ grants are proposed', async () => {
    const tools = buildDAuthAgentTools({ port: stubPort() });
    const tool = tools.find((t) => t.name === 'dauth.evaluate_sod')!;
    const out = await tool.handler('t-1', {
      userId: 'u-1',
      proposedGrants: [{ roleCode: 'maker' }, { roleCode: 'checker' }],
    });
    expect((out as any).conflict).toBe(true);
    expect((out as any).ruleCodes).toContain('SOD_CONFLICT');
  });
});
