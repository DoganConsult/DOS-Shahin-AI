import type { ApprovalRule } from '@dos/types';

/**
 * benchmarks Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const BENCHMARKS_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'benchmarks_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'benchmarks.reviewer',
    requiredPermission: 'benchmarks.approve',
    authorityLevel: 1 as any,
    scopeRule: 'org',
    minApprovers: 1,
    escalationPath: [],
    timeoutHours: 24,
    autoApproveAllowed: false,
    overrideRoles: [],
    evidenceRequired: false,
    commentsRequired: true
  }
];
