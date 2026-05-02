import { safeQuery } from "@dos/db";

/**
 * @cross-layer-bridge: re-exports from DAuth canonical delegation-policy (Law 1)
 * @deprecated @removal-date 2026-09-30 @owner DAuth @replacement platform/dauth/delegation/delegation-policy.service
 *
 * All delegation rule functions have been migrated to the canonical DAuth
 * delegation-policy service. This file re-exports them for backward
 * compatibility with existing consumers.
 */
export {
  type DelegationRule,
  type DelegationCheckResult,
  evaluateDelegation,
  incrementDailyActions,
  getDelegationRules,
  upsertDelegationRule,
  deleteDelegationRule,
} from '../../ports/auth.port';
