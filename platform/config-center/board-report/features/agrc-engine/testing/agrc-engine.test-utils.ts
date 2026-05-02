import type { EngineRuleContract, EngineRunContract, AgrcEngineDiagnosticsContract } from '../contracts/agrc-engine.contracts';
export function mockEngineRule(overrides?: Partial<EngineRuleContract>): EngineRuleContract {
  return { ruleId: 'rule-001', tenantId: 'tenant-001', code: 'CTRL-CYCLE-001', nameEn: 'Quarterly Control Effectiveness Cycle', nameAr: null,
    ruleType: 'control_cycle', enabled: true, schedule: '0 0 1 */3 *', targetModules: ['controls', 'evidence'],
    lastRunAt: new Date().toISOString(), lastRunStatus: 'completed', ownerId: 'user-001',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockEngineRun(overrides?: Partial<EngineRunContract>): EngineRunContract {
  return { runId: 'run-001', ruleId: 'rule-001', status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    actionsTriggered: 15, errorsCount: 0, durationMs: 12000, errorMessage: null, ...overrides };
}
export function mockAgrcEngineDiagnostics(overrides?: Partial<AgrcEngineDiagnosticsContract>): AgrcEngineDiagnosticsContract {
  return { moduleCode: 'agrc-engine', healthy: true, totalRules: 20, enabledRules: 16, failedRuns: 2, staleRules: 1,
    checks: [{ name: 'engine-scheduler', passed: true }, { name: 'rule-execution', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
