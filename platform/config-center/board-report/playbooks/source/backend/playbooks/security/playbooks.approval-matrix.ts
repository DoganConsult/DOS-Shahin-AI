import type { ApprovalRule } from '@dos/types';

/**
 * playbooks Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const PLAYBOOKS_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'playbooks_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'playbooks.reviewer',
    requiredPermission: 'playbooks.approve',
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
