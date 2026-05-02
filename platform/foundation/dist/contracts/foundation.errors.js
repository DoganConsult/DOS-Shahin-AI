"use strict";
/**
 * Public Foundation error code contract — peer modules use these to detect
 * foundation-originated failures and translate them into their own UX.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_ERROR_CODES = void 0;
exports.FOUNDATION_ERROR_CODES = {
    ENTITY_NOT_FOUND: 'FOUNDATION_ENTITY_NOT_FOUND',
    ENTITY_CONFLICT: 'FOUNDATION_ENTITY_CONFLICT',
    HIERARCHY_CYCLE: 'FOUNDATION_HIERARCHY_CYCLE',
    PARENT_NOT_FOUND: 'FOUNDATION_PARENT_NOT_FOUND',
    CODE_DUPLICATE: 'FOUNDATION_CODE_DUPLICATE',
    STATUS_TRANSITION_INVALID: 'FOUNDATION_STATUS_TRANSITION_INVALID',
    TENANT_CONTEXT_MISSING: 'TENANT_CONTEXT_MISSING',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
};
//# sourceMappingURL=foundation.errors.js.map