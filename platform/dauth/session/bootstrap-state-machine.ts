/**
 * R1.1 — Bootstrap State Machine (Frontend)
 *
 * This is the frontend counterpart to the backend lifecycle-normalization module.
 * It classifies bootstrap states into domain families and provides deterministic
 * route resolution matching the backend's SessionBootstrapResult.state.
 *
 * Design rule: bootstrap states here are view-routing states, not persistence states.
 * The backend derives them from persisted DB lifecycle fields deterministically.
 * The frontend only needs to route based on the derived state.
 *
 * @owner DAuth
 * @spec R1.1-F4
 */

// ── Bootstrap State Type ──────────────────────────────────────────────────
// Exhaustive union type matching the backend BootstrapState definition.
// Must stay in sync with backend/src/modules/bootstrap/lifecycle-normalization.ts

export type BootstrapState =
  | 'AUTHENTICATED_UNVERIFIED'
  | 'NO_TENANT'
  | 'TENANT_SUSPENDED'
  | 'TENANT_MEMBER_NO_ROLE'
  | 'ONBOARDING_NOT_STARTED'
  | 'ONBOARDING_IN_PROGRESS'
  | 'ANALYSIS_READY'
  | 'PLAN_READY'
  | 'APPROVED'
  | 'PROVISIONING_QUEUED'
  | 'PROVISIONING_RUNNING'
  | 'PROVISIONING_FAILED'
  | 'WORKSPACE_READY_FIRST_RUN'
  | 'READY';

// ── State Families ────────────────────────────────────────────────────────

/** States where the user is blocked before onboarding can begin */
export const BOOTSTRAP_BLOCKED_STATES = new Set<BootstrapState>([
  'AUTHENTICATED_UNVERIFIED',
  'NO_TENANT',
  'TENANT_SUSPENDED',
  'TENANT_MEMBER_NO_ROLE',
]);

/** States where the user is in the onboarding/provisioning pipeline */
export const BOOTSTRAP_ONBOARDING_STATES = new Set<BootstrapState>([
  'ONBOARDING_NOT_STARTED',
  'ONBOARDING_IN_PROGRESS',
  'ANALYSIS_READY',
  'PLAN_READY',
  'APPROVED',
  'PROVISIONING_QUEUED',
  'PROVISIONING_RUNNING',
  'PROVISIONING_FAILED',
]);

/** States where the workspace is ready for use */
export const BOOTSTRAP_WORKSPACE_READY_STATES = new Set<BootstrapState>([
  'WORKSPACE_READY_FIRST_RUN',
  'READY',
]);

// ── State Classification Functions ────────────────────────────────────────

export function isBlockedState(state: unknown): state is BootstrapState {
  return typeof state === 'string' && BOOTSTRAP_BLOCKED_STATES.has(state as BootstrapState);
}

export function isOnboardingState(state: unknown): state is BootstrapState {
  return typeof state === 'string' && BOOTSTRAP_ONBOARDING_STATES.has(state as BootstrapState);
}

export function isWorkspaceReadyState(state: unknown): state is BootstrapState {
  return typeof state === 'string' && BOOTSTRAP_WORKSPACE_READY_STATES.has(state as BootstrapState);
}

// ── Deterministic Route Resolution ────────────────────────────────────────
// [R1.3] Route resolution has been moved entirely to the backend.
// See lifecycle-normalization.ts for the canonical BOOTSTRAP_ROUTE_MAP.
// The frontend orchestrator should use `bootstrap.next.route` from the API payload.
