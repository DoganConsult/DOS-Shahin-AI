/**
 * DAuth event type contracts — canonical event names and payload types.
 * All dauth event publishers and subscribers should reference these constants
 * to prevent typo-based misrouting.
 */
export declare const DAUTH_EVENTS: {
    readonly LOGIN_SUCCESS: "dauth.login.success";
    readonly LOGIN_FAILURE: "dauth.login.failure";
    readonly REGISTRATION_COMPLETED: "dauth.registration.completed";
    readonly ACCOUNT_LOCKED: "dauth.account.locked";
    readonly PASSWORD_RESET_REQUESTED: "dauth.password_reset.requested";
    readonly PASSWORD_RESET_COMPLETED: "dauth.password_reset.completed";
    readonly SESSION_REVOKED: "dauth.session.revoked";
    readonly SESSIONS_BULK_REVOKED: "dauth.sessions.bulk_revoked";
    readonly SECURITY_EVENT: "dauth.security_event";
    readonly ROLE_CREATED: "dauth.role.created";
    readonly ROLE_DEACTIVATED: "dauth.role.deactivated";
    readonly ROLE_ASSIGNED: "dauth.role.assigned";
    readonly ROLE_REVOKED: "dauth.role.revoked";
    readonly PERMISSION_CREATED: "dauth.permission.created";
    readonly PERMISSION_DEACTIVATED: "dauth.permission.deactivated";
    readonly PERMISSION_ASSIGNED: "dauth.permission.assigned";
    readonly PERMISSION_REVOKED: "dauth.permission.revoked";
    readonly ACCESS_PROFILE_ASSIGNED: "dauth.access_profile.assigned";
    readonly ACCESS_PROFILE_REVOKED: "dauth.access_profile.revoked";
    readonly AUTHORITY_GRANTED: "dauth.authority.granted";
    readonly AUTHORITY_REVOKED: "dauth.authority.revoked";
    readonly APPROVAL_RULE_CREATED: "dauth.approval-rule.created";
    readonly APPROVAL_RULE_DEACTIVATED: "dauth.approval-rule.deactivated";
    readonly DELEGATION_EXPIRED: "dauth.delegation.expired";
    readonly DELEGATION_ACTION_EXECUTED: "dauth.delegation.action_executed";
    readonly INVITATION_CREATED: "dauth.invitation.created";
    readonly MAKER_CHECKER_SUBMITTED: "dauth.maker_checker.submitted";
    readonly MAKER_CHECKER_APPROVED: "dauth.maker_checker.approved";
    readonly MAKER_CHECKER_REJECTED: "dauth.maker_checker.rejected";
    readonly ACCESS_REVIEW_CREATED: "dauth.access_review.created";
    readonly ACCESS_REVIEW_COMPLETED: "dauth.access_review.completed";
    readonly SOD_CONFLICTS_DETECTED: "dauth.sod.conflicts_detected";
    readonly SOD_POLICY_CREATED: "dauth.sod.policy_created";
    readonly SOD_POLICY_DEACTIVATED: "dauth.sod.policy_deactivated";
    readonly SOD_WAIVER_GRANTED: "dauth.sod.waiver_granted";
};
export type DauthEventType = typeof DAUTH_EVENTS[keyof typeof DAUTH_EVENTS];
export interface DauthEventPayload {
    [DAUTH_EVENTS.LOGIN_SUCCESS]: {
        userId: string;
        ip?: string;
        method?: string;
    };
    [DAUTH_EVENTS.LOGIN_FAILURE]: {
        userId?: string;
        email?: string;
        ip?: string;
        reason?: string;
    };
    [DAUTH_EVENTS.REGISTRATION_COMPLETED]: {
        userId: string;
        email: string;
    };
    [DAUTH_EVENTS.ACCOUNT_LOCKED]: {
        userId: string;
        reason?: string;
    };
    [DAUTH_EVENTS.PASSWORD_RESET_REQUESTED]: {
        userId: string;
        email: string;
    };
    [DAUTH_EVENTS.PASSWORD_RESET_COMPLETED]: {
        userId: string;
    };
    [DAUTH_EVENTS.SESSION_REVOKED]: {
        userId: string;
        sessionId: string;
        revokedBy?: string;
    };
    [DAUTH_EVENTS.SESSIONS_BULK_REVOKED]: {
        userId: string;
        count: number;
    };
    [DAUTH_EVENTS.SECURITY_EVENT]: {
        userId: string;
        eventType: string;
        occurredAt: string;
    };
    [DAUTH_EVENTS.ROLE_ASSIGNED]: {
        userId: string;
        roleCode: string;
        assignedBy?: string;
    };
    [DAUTH_EVENTS.ROLE_REVOKED]: {
        userId: string;
        roleCode: string;
        revokedBy?: string;
    };
    [DAUTH_EVENTS.PERMISSION_ASSIGNED]: {
        permissionCode: string;
        roleCode: string;
        assignedBy?: string;
    };
    [DAUTH_EVENTS.PERMISSION_REVOKED]: {
        permissionCode: string;
        roleCode: string;
        revokedBy?: string;
    };
    [DAUTH_EVENTS.DELEGATION_EXPIRED]: {
        delegationId: string;
        fromUserId: string;
        toUserId: string;
    };
    [DAUTH_EVENTS.DELEGATION_ACTION_EXECUTED]: {
        actingUserId: string;
        onBehalfOfUserId: string;
        action?: string;
    };
    [DAUTH_EVENTS.SOD_CONFLICTS_DETECTED]: {
        userId?: string;
        conflicts?: unknown;
        count?: number;
        securityOfficerUserId?: string;
    };
    [DAUTH_EVENTS.SOD_WAIVER_GRANTED]: {
        userId: string;
        ruleId: string;
        grantedBy: string;
    };
    [DAUTH_EVENTS.ACCESS_REVIEW_CREATED]: {
        reviewId: string;
        userId: string;
        reviewerId: string;
    };
    [DAUTH_EVENTS.ACCESS_REVIEW_COMPLETED]: {
        reviewId: string;
        reviewerId: string;
        decision: string;
    };
}
