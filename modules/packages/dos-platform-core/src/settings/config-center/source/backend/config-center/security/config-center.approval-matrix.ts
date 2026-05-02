import type { ApprovalRule } from '@dos/types';

/**
 * configCenter Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const CONFIG_CENTER_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'config-center_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'config-center.reviewer',
    requiredPermission: 'config-center.approve',
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
