import type { ReportDefinitionContract, ReportRunContract, ReportDiagnosticsContract, ReportDashboardContract } from '../contracts/reports.contracts';

export function mockReportDefinition(overrides?: Partial<ReportDefinitionContract>): ReportDefinitionContract {
  return { reportId: 'rpt-001', tenantId: 'tenant-001', titleEn: 'Monthly Compliance Report', titleAr: null, reportType: 'compliance', status: 'published', templateId: 'tmpl-001', ownerId: 'user-001', scheduleCron: '0 8 1 * *', lastGeneratedAt: new Date().toISOString(), exportFormat: 'pdf', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockReportRun(overrides?: Partial<ReportRunContract>): ReportRunContract {
  return { runId: 'run-001', reportId: 'rpt-001', status: 'completed', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 4500, artifactUrl: '/reports/rpt-001/run-001.pdf', errorMessage: null, ...overrides };
}
export function mockReportDiagnostics(overrides?: Partial<ReportDiagnosticsContract>): ReportDiagnosticsContract {
  return { moduleCode: 'reports', healthy: true, totalReports: 18, failedGenerations: 1, staleSchedules: 0, pendingDistributions: 2, checks: [{ name: 'generation_pipeline', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockReportDashboard(overrides?: Partial<ReportDashboardContract>): ReportDashboardContract {
  return { totalReports: 18, byType: { compliance: 6, risk: 4, audit: 3, executive: 3, regulatory: 2 }, byStatus: { published: 10, draft: 4, generating: 1, archived: 3 }, scheduledCount: 8, failedLastWeek: 1, avgGenerationMs: 4500, distributedThisMonth: 12, pendingApproval: 2, ...overrides };
}
