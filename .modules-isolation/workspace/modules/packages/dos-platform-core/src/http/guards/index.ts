export { tenantGuard, perTenantKey, perTenantIpKey } from './tenant-guard';
export type { TenantGuardOptions } from './tenant-guard';

export { moduleGuard, setModuleLookup, invalidateModuleCache, clearModuleCache } from './module-guard';
export type { ModuleGuardOptions } from './module-guard';

export {
  subscriptionStatusGuard,
  setSubscriptionLookup,
  invalidateSubscriptionCache,
  clearSubscriptionCache,
} from './subscription-status-guard';
export type {
  SubscriptionStatus,
  SubscriptionInfo,
  SubscriptionStatusGuardOptions,
} from './subscription-status-guard';

export { fieldRbac, fieldRbacFilter } from './field-rbac';
export { requireOwnership } from './require-ownership';

export {
  classifyFieldSensitivity,
  isRestrictedField,
  isSensitiveField,
  fieldPermissionCode,
  redactPIIValues,
  registerModuleSensitiveFields,
  PII_VALUE_PATTERNS,
} from './sensitive-fields';
export type { SensitivityLevel, SensitiveFieldEntry } from './sensitive-fields';

export {
  logFieldDenial,
  logSuperAdminFieldAccess,
} from './field-denial-audit';
export type { FieldDenialAuditEntry } from './field-denial-audit';
