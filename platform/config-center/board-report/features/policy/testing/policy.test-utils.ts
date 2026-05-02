import type { PolicyContract, PolicyDiagnosticsContract, PolicyDashboardContract } from '../contracts/policy.contracts';

export function mockPolicy(overrides?: Partial<PolicyContract>): PolicyContract {
  return {
    policyId: 'pol-001',
    tenantId: 'tenant-001',
    code: 'POL-IS-001',
    titleEn: 'Information Security Policy',
    titleAr: null,
    policyType: 'corporate',
    status: 'published',
    version: 2,
    ownerId: 'user-001',
    approvedById: 'user-002',
    approvedAt: new Date().toISOString(),
    effectiveDate: new Date().toISOString(),
    reviewDueDate: new Date(Date.now() + 180 * 86400000).toISOString(),
    retiredAt: null,
    parentPolicyId: null,
    linkedFrameworkIds: ['fw-001'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockPolicyDiagnostics(overrides?: Partial<PolicyDiagnosticsContract>): PolicyDiagnosticsContract {
  return {
    moduleCode: 'policy',
    healthy: true,
    totalPolicies: 25,
    overdueReviews: 2,
    draftWithoutOwner: 0,
    expiredWithoutRenewal: 1,
    unacknowledgedCount: 5,
    checks: [
      { name: 'review_cycle_integrity', passed: true },
      { name: 'owner_assignment', passed: true },
    ],
    checkedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockPolicyDashboard(overrides?: Partial<PolicyDashboardContract>): PolicyDashboardContract {
  return {
    totalPolicies: 25,
    byStatus: { published: 15, draft: 5, in_review: 3, retired: 2 },
    byType: { corporate: 8, operational: 10, technical: 5, regulatory: 2 },
    overdueReviews: 2,
    pendingApprovals: 3,
    recentlyPublished: 4,
    acknowledgementRate: 87,
    avgReviewCycleDays: 45,
    ...overrides,
  };
}
