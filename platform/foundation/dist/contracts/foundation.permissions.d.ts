/**
 * Public Foundation permission codes — frozen contract for peer-module gating.
 *
 * If a peer module needs to gate UI/API by foundation permissions, it MUST
 * import these constants instead of hardcoding string codes.
 */
export declare const FOUNDATION_PERMISSION_CODES: {
    readonly READ: "foundation.read";
    readonly WRITE: "foundation.record.write";
    readonly DELETE: "foundation.record.delete";
    readonly APPROVE: "foundation.record.approve";
    readonly MANAGE: "foundation.manage";
    readonly ORG_READ: "foundation.org.read";
    readonly ORG_WRITE: "foundation.org.write";
    readonly RECORD_READ: "foundation.record.read";
    readonly ADMIN_MANAGE: "foundation.manage";
    readonly DOT_READ: "foundation.read";
    readonly SYSTEM_MANAGE: "foundation.system.manage";
};
export type FoundationPermissionCode = (typeof FOUNDATION_PERMISSION_CODES)[keyof typeof FOUNDATION_PERMISSION_CODES];
