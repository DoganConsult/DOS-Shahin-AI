import type { AuditEngagementContract, AuditFindingContract, AuditDiagnosticsContract, AuditDashboardContract } from '../contracts/audit.contracts';

export function mockAuditEngagement(overrides?: Partial<AuditEngagementContract>): AuditEngagementContract {
  return {
    engagementId: 'eng-001',
    tenantId: 'tenant-001',
    titleEn: 'Annual IT General Controls Audit',
    titleAr: null,
    auditType: 'internal',
    status: 'fieldwork',
    leadAuditorId: 'user-001',
    plannedStartDate: new Date().toISOString(),
    plannedEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    actualStartDate: new Date().toISOString(),
    actualEndDate: null,
    findingsCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockAuditFinding(overrides?: Partial<AuditFindingContract>): AuditFindingContract {
  return {
    findingId: 'find-001',
    engagementId: 'eng-001',
    title: 'Inadequate access review process',
    description: 'User access reviews are not conducted quarterly as required',
    severity: 'high',
    status: 'open',
    ownerId: 'user-002',
    dueDate: new Date(Date.now() + 60 * 86400000).toISOString(),
    isRepeat: false,
    linkedControlIds: ['ctrl-001'],
    linkedRiskIds: ['risk-001'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockAuditDiagnostics(overrides?: Partial<AuditDiagnosticsContract>): AuditDiagnosticsContract {
  return {
    moduleCode: 'audit',
    healthy: true,
    totalEngagements: 12,
    overdueEngagements: 1,
    openFindings: 15,
    repeatFindings: 3,
    staleFieldwork: 0,
    checks: [
      { name: 'engagement_integrity', passed: true },
      { name: 'finding_ownership', passed: true },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockAuditDashboard(overrides?: Partial<AuditDashboardContract>): AuditDashboardContract {
  return {
    totalEngagements: 12,
    byStatus: { planning: 2, fieldwork: 3, reporting: 2, follow_up: 3, closed: 2 },
    openFindings: 15,
    criticalFindings: 2,
    repeatFindings: 3,
    overdueRemediations: 4,
    avgEngagementDurationDays: 45,
    findingsBySeverity: { critical: 2, high: 5, medium: 6, low: 2 },
    ...overrides,
  };
}
