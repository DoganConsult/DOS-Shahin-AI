/**
 * Public Foundation event names — string-literal union for cross-module subscribers.
 *
 * Peer modules that subscribe to Foundation events MUST use these constants
 * rather than hardcoding event strings, so a rename is detected at compile time.
 */
export declare const FOUNDATION_EVENT_NAMES: {
    readonly ORG_CREATED: "foundation.org_created";
    readonly ORG_UPDATED: "foundation.org_updated";
    readonly DEPT_CREATED: "foundation.dept_created";
    readonly DEPT_UPDATED: "foundation.dept_updated";
    readonly ROLE_ASSIGNED: "foundation.role.assigned";
    readonly ROLE_UNASSIGNED: "foundation.role.unassigned";
    readonly SCOPE_CHANGED: "foundation.scope_changed";
    readonly POSITION_HOLDER_ASSIGNED: "foundation.position.holder.assigned";
    readonly POSITION_HOLDER_UNASSIGNED: "foundation.position.holder.unassigned";
    readonly ORG_MANAGER_CHANGED: "foundation.org.manager.changed";
};
export type FoundationEventName = (typeof FOUNDATION_EVENT_NAMES)[keyof typeof FOUNDATION_EVENT_NAMES];
/** Events foundation consumes from other modules. Exposed for routing/observability. */
export declare const FOUNDATION_CONSUMED_EVENT_NAMES: {
    readonly WORKFLOW_STATUS_CHANGED: "workflow.status_changed";
    readonly TEAM_MEMBER_ADDED: "team.member_added";
    readonly TEAM_MEMBER_REMOVED: "team.member_removed";
    readonly ONBOARDING_COMPLETED: "onboarding.completed";
};
export type FoundationConsumedEventName = (typeof FOUNDATION_CONSUMED_EVENT_NAMES)[keyof typeof FOUNDATION_CONSUMED_EVENT_NAMES];
