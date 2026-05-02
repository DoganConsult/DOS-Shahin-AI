"use strict";
/**
 * Public Foundation permission codes — frozen contract for peer-module gating.
 *
 * If a peer module needs to gate UI/API by foundation permissions, it MUST
 * import these constants instead of hardcoding string codes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_PERMISSION_CODES = void 0;
exports.FOUNDATION_PERMISSION_CODES = {
    READ: 'foundation.read',
    WRITE: 'foundation.record.write',
    DELETE: 'foundation.record.delete',
    APPROVE: 'foundation.record.approve',
    MANAGE: 'foundation.manage',
    ORG_READ: 'foundation.org.read',
    ORG_WRITE: 'foundation.org.write',
    RECORD_READ: 'foundation.record.read',
    ADMIN_MANAGE: 'foundation.manage',
    DOT_READ: 'foundation.read',
    SYSTEM_MANAGE: 'foundation.system.manage',
};
//# sourceMappingURL=foundation.permissions.js.map