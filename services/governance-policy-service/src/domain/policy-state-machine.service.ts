import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';
import { recordAudit } from '../adapters/audit.adapter';
import { publishDomainEvent, publishPolicyPublished, publishPolicyRetired, publishPolicyReviewed } from '../events/publisher';
import * as policyService from './policy.service';

// State machine canonical to modules/policy/source/backend/policy/workflows/policy-lifecycle.ts.
// Inlined to keep the service self-contained — drift here breaks transitions, so spec covers parity.
export const POLICY_STATES = [
  'draft', 'submitted', 'under_review', 'revision_requested', 'resubmitted',
  'approved', 'published', 'active', 'review_due', 'under_revision', 'retired',
  'review', 'archived',
] as const;

export const POLICY_TRANSITIONS: Record<string, readonly string[]> = {
  draft:               ['submitted', 'review'],
  submitted:           ['under_review'],
  under_review:        ['revision_requested', 'approved'],
  revision_requested:  ['resubmitted'],
  resubmitted:         ['under_review'],
  review:              ['approved', 'draft'],
  approved:            ['published', 'draft'],
  published:           ['active', 'retired'],
  active:              ['review_due', 'retired'],
  review_due:          ['under_revision'],
  under_revision:      ['submitted', 'draft'],
  retired:             ['archived'],
  archived:            [],
};

/**
 * Policy state machine — orchestrates policy.status transitions per the
 * lifecycle defined in modules/policy/.../workflows/policy-lifecycle.ts.
 *
 * Each transition:
 *  - Validates the from-state is current.
 *  - Validates the requested to-state is reachable from from-state.
 *  - Updates dos.policies.status atomically.
 *  - Writes to dos.platform_audit_logs with before/after state via audit adapter.
 *  - Publishes a domain event for downstream consumers (control attachment,
 *    notification, dashboards).
 *  - SoD enforcement is applied at the route layer via the existing SoD
 *    middleware before this service runs.
 */

export type PolicyState = (typeof POLICY_STATES)[number];

export interface TransitionResult {
  policyId: string;
  fromState: PolicyState;
  toState: PolicyState;
  actorId: string;
  occurredAt: string;
}

export class IllegalStateTransitionError extends Error {
  constructor(public readonly fromState: string, public readonly toState: string) {
    super(`Illegal state transition: ${fromState} -> ${toState}`);
    this.name = 'IllegalStateTransitionError';
  }
}

export class PolicyNotFoundError extends Error {
  constructor(public readonly policyId: string) {
    super(`Policy not found: ${policyId}`);
    this.name = 'PolicyNotFoundError';
  }
}

export class SodViolationError extends Error {
  constructor(
    public readonly action: string,
    public readonly actorId: string,
    public readonly conflictWith: string,
  ) {
    super(`SoD violation: actor ${actorId} cannot ${action} (same actor as ${conflictWith})`);
    this.name = 'SodViolationError';
  }
}

// Transitions that require segregation of duties: the actor cannot be the
// drafter (owner_id) of the policy. Bypass via the existing SoD workflow
// reroute middleware in onboarding-service when same-actor is unavoidable.
const SOD_GATED_TRANSITIONS = new Set<string>(['approved', 'published']);

function assertReachable(from: string, to: string): void {
  const allowed = POLICY_TRANSITIONS[from as PolicyState] ?? [];
  if (!allowed.includes(to as PolicyState)) {
    throw new IllegalStateTransitionError(from, to);
  }
}

async function transition(
  tenantId: string,
  policyId: string,
  toState: PolicyState,
  actorId: string,
  context: Record<string, unknown> = {},
): Promise<TransitionResult> {
  const policy = await policyService.getById(tenantId, policyId);
  if (!policy) throw new PolicyNotFoundError(policyId);

  const fromState = (policy.status || 'draft') as PolicyState;
  assertReachable(fromState, toState);

  // SoD guard: drafter cannot self-approve / self-publish.
  if (SOD_GATED_TRANSITIONS.has(toState) && policy.owner_id && policy.owner_id === actorId) {
    throw new SodViolationError(`transition to ${toState}`, actorId, 'policy owner');
  }

  try {
    await safeQuery(
      `UPDATE dos.policies SET status = $3, updated_at = NOW() WHERE tenant_id = $1 AND policy_id = $2 AND deleted_at IS NULL`,
      [tenantId, policyId, toState],
    );
  } catch (err) {
    logger.error('[policy-state-machine] DB update failed', {
      tenantId,
      policyId,
      fromState,
      toState,
      error: toErrorMessage(err),
    });
    throw err;
  }

  const occurredAt = new Date().toISOString();

  // Audit (decoupled — failure must not roll back the transition)
  recordAudit(tenantId, `policy.transition.${toState}`, 'policy', policyId, actorId, {
    fromState,
    toState,
    ...context,
  }).catch((err) => logger.warn('[policy-state-machine] audit write failed', { policyId, error: toErrorMessage(err) }));

  // Domain event
  publishDomainEvent(`policy.${toState}`, {
    entityId: policyId,
    fromState,
    toState,
    actorId,
    ...context,
  }, tenantId, actorId).catch((err) =>
    logger.warn('[policy-state-machine] event publish failed', { policyId, error: toErrorMessage(err) }),
  );

  // Specific named events for back-compat with existing consumers
  if (toState === 'published') {
    publishPolicyPublished(tenantId, policyId, { fromState, actorId }, actorId).catch(() => {});
  } else if (toState === 'review_due' || toState === 'review') {
    publishPolicyReviewed(tenantId, policyId, { fromState, actorId }, actorId).catch(() => {});
  } else if (toState === 'retired') {
    publishPolicyRetired(tenantId, policyId, { fromState, actorId }, actorId).catch(() => {});
  }

  logger.info('[policy-state-machine] transition', { tenantId, policyId, fromState, toState, actorId });
  return { policyId, fromState, toState, actorId, occurredAt };
}

// Public surface: one method per supported transition. Routes call these
// directly; SoD middleware enforces same-actor-different-action separation
// at the HTTP layer.

export function submit(tenantId: string, policyId: string, actorId: string): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'submitted', actorId);
}

export function review(tenantId: string, policyId: string, actorId: string, reviewerId?: string): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'under_review', actorId, { reviewerId });
}

export function requestRevision(
  tenantId: string,
  policyId: string,
  actorId: string,
  reason?: string,
): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'revision_requested', actorId, { reason });
}

export function resubmit(tenantId: string, policyId: string, actorId: string): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'resubmitted', actorId);
}

export function approve(
  tenantId: string,
  policyId: string,
  actorId: string,
  approverNote?: string,
): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'approved', actorId, { approverNote });
}

export function publish(
  tenantId: string,
  policyId: string,
  actorId: string,
  effectiveDate?: string,
): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'published', actorId, { effectiveDate });
}

export function activate(tenantId: string, policyId: string, actorId: string): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'active', actorId);
}

export function markReviewDue(tenantId: string, policyId: string, actorId: string): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'review_due', actorId);
}

export function startRevision(tenantId: string, policyId: string, actorId: string): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'under_revision', actorId);
}

export function retire(
  tenantId: string,
  policyId: string,
  actorId: string,
  reason?: string,
): Promise<TransitionResult> {
  return transition(tenantId, policyId, 'retired', actorId, { reason });
}

// Read helpers
export async function getCurrentState(tenantId: string, policyId: string): Promise<PolicyState | null> {
  const policy = await policyService.getById(tenantId, policyId);
  return policy ? (policy.status as PolicyState) : null;
}

export function getReachableStates(fromState: PolicyState): PolicyState[] {
  return [...((POLICY_TRANSITIONS[fromState] ?? []) as readonly PolicyState[])];
}
