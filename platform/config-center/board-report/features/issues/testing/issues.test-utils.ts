import type { IssueContract, IssueDiagnosticsContract } from '../contracts/issues.contracts';
export function mockIssue(overrides?: Partial<IssueContract>): IssueContract {
  return { issueId: 'iss-001', tenantId: 'tenant-001', code: 'ISS-2026-001', titleEn: 'Incomplete Access Reviews', titleAr: null,
    status: 'assigned', priority: 'high', category: 'compliance', description: 'Quarterly access reviews incomplete for 3 systems',
    reportedById: 'user-003', assignedToId: 'user-002', ownerId: 'user-001', sourceModule: 'audit', sourceId: 'find-001',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString(), resolvedAt: null, closedAt: null,
    linkedRemediationIds: ['rem-001'], escalationCount: 0, isOverdue: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockIssueDiagnostics(overrides?: Partial<IssueDiagnosticsContract>): IssueDiagnosticsContract {
  return { moduleCode: 'issues', healthy: true, totalIssues: 40, openCount: 18, overdueCount: 5, escalatedCount: 2, unassignedCount: 3,
    avgResolutionDays: 12, checks: [{ name: 'issue-tracking', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockIssueList(count = 5): IssueContract[] { return Array.from({ length: count }, (_, i) => mockIssue({ issueId: `iss-${String(i+1).padStart(3,'0')}`, titleEn: `Issue ${i+1}` })); }
