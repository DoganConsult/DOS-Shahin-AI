/**
 * quality-gate — Approval Matrix
 * Gate override requires dual approval to prevent unilateral quality bypasses.
 */

import type { ApprovalRule } from '@dos/types';

export const QGATE_APPROVAL_MATRIX: ApprovalRule[] = [
  {
    entityType: 'qgate_runs',
    fromStatus: 'failed',
    toStatus: 'overridden',
    requiredRole: 'quality-gate.executive_owner',
    requiredPermission: 'quality-gate.run.override',
    authorityLevel: 'required',
    scopeRule: 'org',
    minApprovers: 1,
    escalationPath: ['quality-gate.executive_owner', 'admin.executive_owner'],
    timeoutHours: 4,
    autoApproveAllowed: false,
    overrideRoles: ['admin.executive_owner'],
    evidenceRequired: true,
    commentsRequired: true,
  },
  {
    entityType: 'qgate_thresholds',
    fromStatus: 'draft',
    toStatus: 'in_review',
    requiredRole: 'quality-gate.operator',
    requiredPermission: 'quality-gate.threshold.write',
    authorityLevel: 'required',
    scopeRule: 'org',
    minApprovers: 0,
    escalationPath: ['quality-gate.executive_owner'],
    timeoutHours: 24,
    autoApproveAllowed: true,
    overrideRoles: ['quality-gate.executive_owner'],
    evidenceRequired: false,
    commentsRequired: true,
  },
];
