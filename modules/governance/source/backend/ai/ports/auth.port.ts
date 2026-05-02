export { authenticate, requirePermission } from '@dos/module-auth';
export { getDelegations, createDelegation, revokeDelegation, getActiveDelegationsForUser } from '@dos/module-auth';
export { evaluateDelegation, incrementDailyActions, getDelegationRules, upsertDelegationRule, deleteDelegationRule } from '@dos/module-auth';
export type { DelegationRule, DelegationCheckResult } from '@dos/module-auth';
