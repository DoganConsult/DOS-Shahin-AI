import type { ReportDefinitionContract, ReportRunContract, ReportTemplateContract, ReportingDiagnosticsContract } from '../contracts/reporting.contracts';

export function mockReportDefinition(overrides?: Partial<ReportDefinitionContract>): ReportDefinitionContract {
  return {
    reportId: 'rpt-001', tenantId: 'tenant-001', code: 'BOARD-RISK-Q1',
    nameEn: 'Q1 Board Risk Report', nameAr: null,
    status: 'approved', reportType: 'board',
    description: 'Quarterly board-level risk posture report with executive summary',
    templateId: 'tmpl-001', sourceModules: ['risk', 'controls', 'compliance'],
    ownerId: 'user-001', scheduleFrequency: 'quarterly',
    lastGeneratedAt: new Date().toISOString(), nextScheduledAt: new Date(Date.now() + 90 * 86400000).toISOString(),
    exportFormats: ['pdf', 'pptx'], approvedById: 'user-002', releasedAt: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockReportRun(overrides?: Partial<ReportRunContract>): ReportRunContract {
  return {
    runId: 'run-001', reportId: 'rpt-001', tenantId: 'tenant-001',
    status: 'completed', startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(), durationMs: 4500,
    outputFormat: 'pdf', outputSizeBytes: 2048000,
    errorMessage: null, triggeredById: 'user-001', ...overrides,
  };
}

export function mockReportTemplate(overrides?: Partial<ReportTemplateContract>): ReportTemplateContract {
  return {
    templateId: 'tmpl-001', tenantId: 'tenant-001', code: 'TMPL-BOARD',
    nameEn: 'Board Report Template', reportType: 'board', version: '1.0',
    sections: ['Executive Summary', 'Risk Posture', 'Key Indicators', 'Recommendations'],
    isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockReportingDiagnostics(overrides?: Partial<ReportingDiagnosticsContract>): ReportingDiagnosticsContract {
  return {
    moduleCode: 'reporting', healthy: true, totalReports: 24,
    failedRuns: 0, overdueSchedules: 1, pendingApprovals: 2, avgGenerationMs: 3800,
    checks: [{ name: 'generation-pipeline', passed: true }, { name: 'schedule-health', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}
