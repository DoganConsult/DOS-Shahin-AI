// ============================================
// Process Orchestration — Barrel Re-export
// Preserves the original public API surface.
// ============================================

// Public types and constants
export type { ProcessTaskType, ProcessTaskInput, ProcessTask } from './types';
export type { RoutingResolution } from './types';
export { EMPTY_RESOLUTION, SLA_DEFAULTS, TASK_TYPE_TO_PERMISSION_ACTION, TASK_PRIORITY_TO_MIN_AUTHORITY } from './types';

// Schema introspection utilities
export { tableExists, columnExists, getTaskTypePermissionAction } from './schema-introspection';

// Entity descriptor wrappers (ModuleDescriptor → legacy fallback)
export { getEntityModule, getEntityTable, getFallbackDomain } from './entity-descriptor-wrappers';

// 5-Tier routing resolution
export { resolveByRoleHint, resolveByRecordOwnership, resolveByEnterpriseAuthz, resolveByDynamicRACI, resolveByFallbackMap } from './routing-tiers';

// SLA enforcement
export { lookupSLA } from './sla-enforcement';

// Task lifecycle
export { createProcessTask } from './task-creation';
export { completeProcessTask } from './task-completion';

// Notification & audit logging
export { notifyRACIInformed, logRoutingDecision } from './notification-logging';
