import type { ApprovalRule } from '@dos/types';

/**
 * mobile Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const MOBILE_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'mobile_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'mobile.reviewer',
    requiredPermission: 'mobile.approve',
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
