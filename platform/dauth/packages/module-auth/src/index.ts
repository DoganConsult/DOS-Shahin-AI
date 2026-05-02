/**
 * @dos/module-auth — module-facing auth surface.
 *
 * Product modules import from this package; they MUST NOT import from
 * @dos/dauth-* directly. The product shell decides which underlying auth
 * platform module to wire in (DAuth today). This indirection makes the
 * module portable across platforms that ship different auth modules.
 *
 * Today this barrel re-exports the canonical DAuth surface used by
 * existing modules. Tomorrow a product can override the package
 * resolution (or build a new product-side adapter package) to swap in
 * an alternative auth provider without touching any module code.
 *
 * Enforced by the `modules-cannot-import-dauth` rule in
 * `.dependency-cruiser.cjs`.
 */

// HTTP middleware, token issuance, and stateless lifecycle/email checks
// live in @dos/dauth-shared.
export {
  authenticate,
  requirePermission,
  requireTenantId,
  isUserEmailVerified,
  evaluateLifecycleTransition,
  issueAccessToken,
  issueRefreshToken,
} from '@dos/dauth-shared';

export type { AccessTokenClaims } from '@dos/dauth-shared';

// Stateful domain services (SoD, delegation) live in @dos/dauth-core.
// They touch DB/state; callers compose them inside their own handlers.
export {
  evaluateSod,
  checkSelfApproval,
  evaluateDelegatedAccess,
  evaluateDelegation,
  incrementDailyActions,
  getDelegationRules,
  upsertDelegationRule,
  deleteDelegationRule,
  getDelegations,
  createDelegation,
  revokeDelegation,
  getActiveDelegationsForUser,
  validateDelegation,
} from '@dos/dauth-core';

export type {
  ActingOnBehalfOfContext,
  DelegationRule,
  DelegationCheckResult,
  DelegationScope,
  LifecycleAuthResult,
  SodCheckResult,
} from '@dos/dauth-core';
