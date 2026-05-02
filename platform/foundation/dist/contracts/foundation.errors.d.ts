/**
 * Public Foundation error code contract — peer modules use these to detect
 * foundation-originated failures and translate them into their own UX.
 */
export declare const FOUNDATION_ERROR_CODES: {
    readonly ENTITY_NOT_FOUND: "FOUNDATION_ENTITY_NOT_FOUND";
    readonly ENTITY_CONFLICT: "FOUNDATION_ENTITY_CONFLICT";
    readonly HIERARCHY_CYCLE: "FOUNDATION_HIERARCHY_CYCLE";
    readonly PARENT_NOT_FOUND: "FOUNDATION_PARENT_NOT_FOUND";
    readonly CODE_DUPLICATE: "FOUNDATION_CODE_DUPLICATE";
    readonly STATUS_TRANSITION_INVALID: "FOUNDATION_STATUS_TRANSITION_INVALID";
    readonly TENANT_CONTEXT_MISSING: "TENANT_CONTEXT_MISSING";
    readonly VALIDATION_FAILED: "VALIDATION_FAILED";
};
export type FoundationErrorCode = (typeof FOUNDATION_ERROR_CODES)[keyof typeof FOUNDATION_ERROR_CODES];
export interface FoundationErrorBody {
    code: FoundationErrorCode | string;
    message: string;
    status: number;
    correlationId?: string;
    details?: Record<string, unknown>;
}
