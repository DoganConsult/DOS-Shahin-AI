/**
 * OpenTelemetry span definitions for the Foundation module.
 *
 * Use these constants when starting spans inside services/routes so all
 * traces share a stable, queryable name across deployments.
 */

export const FOUNDATION_TRACE_SPANS = {
  // Org hierarchy
  ORG_TREE_BUILD: 'foundation.org.tree.build',
  ORG_NODE_CREATE: 'foundation.org.node.create',
  ORG_NODE_UPDATE: 'foundation.org.node.update',
  ORG_NODE_DELETE: 'foundation.org.node.delete',

  // Business unit / department
  BU_LIST: 'foundation.bu.list',
  BU_UPSERT: 'foundation.bu.upsert',
  DEPT_LIST: 'foundation.dept.list',
  DEPT_UPSERT: 'foundation.dept.upsert',

  // Positions / committees / ownership
  POSITION_ASSIGN: 'foundation.position.assign',
  COMMITTEE_DECISION: 'foundation.committee.decision',
  OWNERSHIP_RESOLVE: 'foundation.ownership.resolve',

  // SoD + access review
  SOD_CHECK: 'foundation.sod.check',
  ACCESS_REVIEW_RUN: 'foundation.access_review.run',
  ACCESS_SNAPSHOT_BUILD: 'foundation.access.snapshot.build',

  // Lifecycle
  BOOTSTRAP: 'foundation.bootstrap',
  EVENT_PUBLISH: 'foundation.event.publish',
  EVENT_CONSUME: 'foundation.event.consume',
} as const;

export type FoundationTraceSpan =
  (typeof FOUNDATION_TRACE_SPANS)[keyof typeof FOUNDATION_TRACE_SPANS];

/** Standard span attributes Foundation always sets. */
export const FOUNDATION_TRACE_ATTRS = {
  TENANT_ID: 'foundation.tenant_id',
  ENTITY_ID: 'foundation.entity_id',
  ENTITY_TYPE: 'foundation.entity_type',
  ACTOR_ID: 'foundation.actor_id',
  EVENT_NAME: 'foundation.event_name',
  CORRELATION_ID: 'foundation.correlation_id',
} as const;
