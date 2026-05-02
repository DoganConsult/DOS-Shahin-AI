import { safeQuery } from "@dos/db";

/** @deprecated @removal-date 2026-09-30 @owner DAuth @replacement platform/dauth/delegation/delegation.service.ts — Canonical delegation moved to DAuth (Law 1, Law 8). */
export {
  type DelegationScope,
  type DelegationGrant,
  type DelegationAction,
  createDelegationGrant,
  revokeDelegationGrant,
  validateDelegation,
  generateDelegatedToken,
  requireExplicitGrant,
  executeDelegatedAction,
  recordDelegatedAction,
  getActiveGrants,
  getDelegationHistory,
  ACTION_TYPE_TO_SCOPE,
} from '../../ports/auth.port';
