import type { ApprovalRule } from '@dos/types';

/**
 * executive Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const EXECUTIVE_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'executive_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'executive.reviewer',
    requiredPermission: 'executive.approve',
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
