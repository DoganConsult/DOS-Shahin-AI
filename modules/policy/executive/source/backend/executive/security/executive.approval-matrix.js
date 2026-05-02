"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXECUTIVE_APPROVAL_MATRIX = void 0;
/**
 * executive Approval Matrix
 * Defines which transitions require workflow approval.
 */
exports.EXECUTIVE_APPROVAL_MATRIX = [
    {
        entityType: 'executive_records',
        fromStatus: 'under_review',
        toStatus: 'approved',
        requiredRole: 'executive.reviewer',
        requiredPermission: 'executive.approve',
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
//# sourceMappingURL=executive.approval-matrix.js.map