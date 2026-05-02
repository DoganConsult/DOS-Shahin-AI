import type { ActionItemContract, ActionDiagnosticsContract } from '../contracts/action.contracts';

export function mockAction(overrides?: Partial<ActionItemContract>): ActionItemContract {
  return {
    actionId: 'act-001', tenantId: 'tenant-001', titleEn: 'Update firewall rules', titleAr: null,
    description: 'Apply new firewall ACL rules per security review', status: 'in_progress', priority: 'high',
    source: 'incident', sourceId: 'inc-001', assignedToId: 'user-002', ownerId: 'user-001',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), completedAt: null, verifiedById: null,
    verifiedAt: null, progressPercent: 40, isOverdue: false, linkedModuleCode: 'incident',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockActionDiagnostics(overrides?: Partial<ActionDiagnosticsContract>): ActionDiagnosticsContract {
  return { moduleCode: 'action', healthy: true, totalActions: 60, openCount: 22, overdueCount: 5, blockedCount: 3, completionRate: 72, avgCompletionDays: 12, checks: [{ name: 'action-tracking', passed: true }, { name: 'overdue-alerts', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}

export function mockActionList(count = 5): ActionItemContract[] {
  return Array.from({ length: count }, (_, i) => mockAction({ actionId: `act-${String(i + 1).padStart(3, '0')}`, titleEn: `Action ${i + 1}` }));
}
