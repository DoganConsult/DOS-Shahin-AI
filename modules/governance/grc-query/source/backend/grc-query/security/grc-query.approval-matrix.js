"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRC_QUERY_APPROVAL_MATRIX = void 0;
/**
 * grcQuery Approval Matrix
 * Defines which transitions require workflow approval.
 */
exports.GRC_QUERY_APPROVAL_MATRIX = [
    {
        entityType: 'grc-query_records',
        fromStatus: 'under_review',
        toStatus: 'approved',
        requiredRole: 'grc-query.reviewer',
        requiredPermission: 'grc-query.approve',
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
//# sourceMappingURL=grc-query.approval-matrix.js.map