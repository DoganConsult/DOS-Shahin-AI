"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLIANCE_CONTROL_STATUSES = void 0;
exports.isControlStatus = isControlStatus;
exports.COMPLIANCE_CONTROL_STATUSES = [
    'not_started',
    'in_progress',
    'implemented',
    'effective',
    'ineffective',
    'not_applicable',
];
function isControlStatus(value) {
    return typeof value === 'string' && exports.COMPLIANCE_CONTROL_STATUSES.includes(value);
}
//# sourceMappingURL=compliance.js.map