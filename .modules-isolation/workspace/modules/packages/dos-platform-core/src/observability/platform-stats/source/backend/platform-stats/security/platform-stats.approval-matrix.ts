import type { ApprovalRule } from '@dos/types';

/**
 * platformStats Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const PLATFORM_STATS_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'platform-stats_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'platform-stats.reviewer',
    requiredPermission: 'platform-stats.approve',
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
