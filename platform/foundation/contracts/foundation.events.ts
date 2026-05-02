/**
 * Public Foundation event names — string-literal union for cross-module subscribers.
 *
 * Peer modules that subscribe to Foundation events MUST use these constants
 * rather than hardcoding event strings, so a rename is detected at compile time.
 */

export const FOUNDATION_EVENT_NAMES = {
  ORG_CREATED: 'foundation.org_created',
  ORG_UPDATED: 'foundation.org_updated',
  DEPT_CREATED: 'foundation.dept_created',
  DEPT_UPDATED: 'foundation.dept_updated',
  ROLE_ASSIGNED: 'foundation.role.assigned',
  ROLE_UNASSIGNED: 'foundation.role.unassigned',
  SCOPE_CHANGED: 'foundation.scope_changed',
  POSITION_HOLDER_ASSIGNED: 'foundation.position.holder.assigned',
  POSITION_HOLDER_UNASSIGNED: 'foundation.position.holder.unassigned',
  ORG_MANAGER_CHANGED: 'foundation.org.manager.changed',
} as const;

export type FoundationEventName =
  (typeof FOUNDATION_EVENT_NAMES)[keyof typeof FOUNDATION_EVENT_NAMES];

/** Events foundation consumes from other modules. Exposed for routing/observability. */
export const FOUNDATION_CONSUMED_EVENT_NAMES = {
  WORKFLOW_STATUS_CHANGED: 'workflow.status_changed',
  TEAM_MEMBER_ADDED: 'team.member_added',
  TEAM_MEMBER_REMOVED: 'team.member_removed',
  ONBOARDING_COMPLETED: 'onboarding.completed',
} as const;

export type FoundationConsumedEventName =
  (typeof FOUNDATION_CONSUMED_EVENT_NAMES)[keyof typeof FOUNDATION_CONSUMED_EVENT_NAMES];
