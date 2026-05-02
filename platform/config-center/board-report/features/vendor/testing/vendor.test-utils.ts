import type { VendorContract, VendorAssessmentContract, VendorDiagnosticsContract, VendorDashboardContract } from '../contracts/vendor.contracts';

export function mockVendor(overrides?: Partial<VendorContract>): VendorContract {
  return {
    vendorId: 'vendor-001',
    tenantId: 'tenant-001',
    name: 'Cloud Infrastructure Provider',
    code: 'VND-CLOUD-001',
    status: 'active',
    riskTier: 'critical',
    category: 'technology',
    primaryContactName: 'Jane Smith',
    primaryContactEmail: 'jane@vendor.com',
    contractExpiryDate: new Date(Date.now() + 365 * 86400000).toISOString(),
    lastAssessmentDate: new Date().toISOString(),
    nextAssessmentDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    dueDiligenceStatus: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockVendorAssessment(overrides?: Partial<VendorAssessmentContract>): VendorAssessmentContract {
  return {
    assessmentId: 'assess-001',
    vendorId: 'vendor-001',
    assessmentType: 'periodic',
    status: 'completed',
    overallScore: 85,
    completedAt: new Date().toISOString(),
    nextDueDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    ...overrides,
  };
}

export function mockVendorDiagnostics(overrides?: Partial<VendorDiagnosticsContract>): VendorDiagnosticsContract {
  return {
    moduleCode: 'vendor',
    healthy: true,
    totalVendors: 42,
    expiredContracts: 2,
    overdueAssessments: 3,
    criticalTierVendors: 8,
    staleOnboarding: 1,
    checks: [
      { name: 'contract_integrity', passed: true },
      { name: 'assessment_freshness', passed: true },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockVendorDashboard(overrides?: Partial<VendorDashboardContract>): VendorDashboardContract {
  return {
    totalVendors: 42,
    byStatus: { active: 30, prospect: 5, onboarding: 3, under_review: 2, suspended: 1, terminated: 1 },
    byRiskTier: { critical: 8, high: 12, medium: 15, low: 7 },
    expiredContracts: 2,
    overdueAssessments: 3,
    pendingOnboarding: 3,
    avgAssessmentScore: 78,
    criticalVendorsCount: 8,
    ...overrides,
  };
}
