import type { ApprovalRule } from '@dos/types';

/**
 * grcQuery Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const GRC_QUERY_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'grc-query_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'grc-query.reviewer',
    requiredPermission: 'grc-query.approve',
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
