"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOBILE_APPROVAL_MATRIX = void 0;
/**
 * mobile Approval Matrix
 * Defines which transitions require workflow approval.
 */
exports.MOBILE_APPROVAL_MATRIX = [
    {
        entityType: 'mobile_records',
        fromStatus: 'under_review',
        toStatus: 'approved',
        requiredRole: 'mobile.reviewer',
        requiredPermission: 'mobile.approve',
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
//# sourceMappingURL=mobile.approval-matrix.js.map