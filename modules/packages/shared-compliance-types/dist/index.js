"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLIANCE_CONTROL_STATUSES = void 0;
exports.isControlStatus = isControlStatus;
/**
 * Shared compliance domain types and constants.
 *
 * Source-of-truth enum for control statuses used by both backend services
 * and the SPA. The compliance-controls page imports COMPLIANCE_CONTROL_STATUSES
 * to populate filter chips and uses isControlStatus to validate API payloads.
 */
exports.COMPLIANCE_CONTROL_STATUSES = [
    'effective',
    'partial',
    'ineffective',
    'not_assessed',
    'not_applicable',
];
function isControlStatus(value) {
    return (typeof value === 'string' &&
        exports.COMPLIANCE_CONTROL_STATUSES.includes(value));
}
//# sourceMappingURL=index.js.map