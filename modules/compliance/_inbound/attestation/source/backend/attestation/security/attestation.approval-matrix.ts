import type { ApprovalRule } from '@dos/types';

/**
 * attestation Approval Matrix
 * Defines which transitions require workflow approval.
 */
export const ATTESTATION_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'attestation_records',
    fromStatus: 'under_review',
    toStatus: 'approved',
    requiredRole: 'attestation.reviewer',
    requiredPermission: 'attestation.approve',
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
