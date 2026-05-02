import type { ProcessingActivityContract, PrivacyAssessmentContract, PrivacyDiagnosticsContract } from '../contracts/privacy.contracts';
export function mockProcessingActivity(overrides?: Partial<ProcessingActivityContract>): ProcessingActivityContract {
  return { activityId: 'pa-001', tenantId: 'tenant-001', code: 'HR-RECRUIT', nameEn: 'Employee Recruitment Processing', nameAr: null,
    status: 'active', processingBasis: 'contract', dataCategoriesProcessed: ['personal', 'sensitive'],
    purpose: 'Processing candidate applications for employment', ownerId: 'user-001', dpoReviewedById: 'user-003',
    dataSubjectCategories: ['job_applicants'], recipientCategories: ['hr_department', 'hiring_managers'],
    retentionPeriodDays: 365, crossBorderTransfer: false, transferSafeguard: null,
    dpiaRequired: true, dpiaCompletedAt: new Date().toISOString(),
    lastReviewDate: new Date().toISOString(), nextReviewDate: new Date(Date.now() + 180 * 86400000).toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockPrivacyAssessment(overrides?: Partial<PrivacyAssessmentContract>): PrivacyAssessmentContract {
  return { assessmentId: 'pva-001', activityId: 'pa-001', assessmentType: 'dpia', status: 'completed', riskLevel: 'medium',
    assessedById: 'user-003', completedAt: new Date().toISOString(), findings: null, ...overrides };
}
export function mockPrivacyDiagnostics(overrides?: Partial<PrivacyDiagnosticsContract>): PrivacyDiagnosticsContract {
  return { moduleCode: 'privacy', healthy: true, totalActivities: 30, nonCompliantCount: 2, overdueReviews: 3, pendingDpias: 1,
    crossBorderWithoutSafeguard: 0, checks: [{ name: 'ropa-completeness', passed: true }, { name: 'dpia-coverage', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides };
}
export function mockActivityList(count = 5): ProcessingActivityContract[] { return Array.from({ length: count }, (_, i) => mockProcessingActivity({ activityId: `pa-${String(i+1).padStart(3,'0')}`, nameEn: `Activity ${i+1}` })); }
