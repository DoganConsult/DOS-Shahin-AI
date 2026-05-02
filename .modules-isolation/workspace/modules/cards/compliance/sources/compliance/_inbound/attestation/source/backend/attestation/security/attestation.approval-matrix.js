"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTESTATION_APPROVAL_MATRIX = void 0;
/**
 * attestation Approval Matrix
 * Defines which transitions require workflow approval.
 */
exports.ATTESTATION_APPROVAL_MATRIX = [
    {
        entityType: 'attestation_records',
        fromStatus: 'under_review',
        toStatus: 'approved',
        requiredRole: 'attestation.reviewer',
        requiredPermission: 'attestation.approve',
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
//# sourceMappingURL=attestation.approval-matrix.js.map