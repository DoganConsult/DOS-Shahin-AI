"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYBOOKS_APPROVAL_MATRIX = void 0;
/**
 * playbooks Approval Matrix
 * Defines which transitions require workflow approval.
 */
exports.PLAYBOOKS_APPROVAL_MATRIX = [
    {
        entityType: 'playbooks_records',
        fromStatus: 'under_review',
        toStatus: 'approved',
        requiredRole: 'playbooks.reviewer',
        requiredPermission: 'playbooks.approve',
        authorityLevel: 1,
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
//# sourceMappingURL=playbooks.approval-matrix.js.map