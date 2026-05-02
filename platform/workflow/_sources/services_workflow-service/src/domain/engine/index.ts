/**
 * DOS Workflow Core — Canonical Barrel (Patch 7 §2.3)
 *
 * This is the canonical entry point for the platform workflow engine.
 * All new code MUST import from this location.
 *
 * @owner DOS
 * @since 2026-03-30
 */

// ── Engine ──────────────────────────────────────────────────────────────
export {
  startWorkflowExecution,
  advanceStep,
  completeStep,
  cancelExecution,
  getInstanceStatus,
  evaluateCondition,
  evaluateTransitionConditions,
  createApprovalForStep,
  onApprovalResolved,
  getFailurePath,
} from './engine/workflow-engine.service';
export type {
  EngineStep,
  EngineTransition,
  EngineCondition,
  InstanceStepRecord,
  StartResult,
  AdvanceResult,
} from './engine/workflow-engine.service';

// ── Events ──────────────────────────────────────────────────────────────

export { emitWorkflowEvent } from './events/workflow-event-emitter.service';

export type { WorkflowEventType, WorkflowEventPayload } from './events/workflow-event-emitter.service';
export { emitWorkflowEvent as emitWorkflowEntityEvent } from './events/workflow-event.service';
export type { WorkflowEntityType, WorkflowAction } from './events/workflow-event.service';

// ── Actions ─────────────────────────────────────────────────────────────
export {
  executeNotificationStep,
  executeApiCallNode,
  executeSendEmailNode,
  executeWebhookNode,
} from './actions/workflow-actions.service';

// ── Process Orchestration ───────────────────────────────────────────────
export type { ProcessTaskType, ProcessTaskInput, ProcessTask, RoutingResolution } from './orchestration/types';
export { EMPTY_RESOLUTION, SLA_DEFAULTS, TASK_TYPE_TO_PERMISSION_ACTION, TASK_PRIORITY_TO_MIN_AUTHORITY } from './orchestration/types';
export { tableExists, columnExists, getTaskTypePermissionAction } from './orchestration/schema-introspection';
export { getEntityModule, getEntityTable, getFallbackDomain } from './orchestration/entity-descriptor-wrappers';
export { resolveByRoleHint, resolveByRecordOwnership, resolveByEnterpriseAuthz, resolveByDynamicRACI, resolveByFallbackMap } from './orchestration/routing-tiers';
export { lookupSLA } from './orchestration/sla-enforcement';
export { createProcessTask } from './orchestration/task-creation';
export { completeProcessTask } from './orchestration/task-completion';
export { notifyRACIInformed, logRoutingDecision } from './orchestration/notification-logging';

// ── Types ───────────────────────────────────────────────────────────────
export * from './types/workflow-types';

// ── 3-Level Workflow + Operating Modes ──────────────────────────────────
export {
  WORKFLOW_MODES,
  WORKFLOW_MODE_CONFIGS,
  getWorkflowModeConfig,
  isValidWorkflowMode,
  getApprovalLevelsForMode,
  getSlaHoursForMode,
  getTenantWorkflowMode,
  resolveEffectiveMode,
  resolveEffectiveModeConfig,
  clearTenantModeCache,
} from './modes';
export type {
  WorkflowMode,
  WorkflowModeConfig,
  TenantWorkflowOverride,
} from './modes';

export {
  WORKFLOW_LEVELS,
  WORKFLOW_LEVEL_CONFIGS,
  resolveWorkflowLevel,
  getWorkflowLevelConfig,
} from './integration';
export type {
  WorkflowLevel,
  WorkflowLevelConfig,
  RiskClassification,
  WorkflowLevelResolutionInput,
  WorkflowLevelResolution,
} from './integration';

// ── Lifecycle Bridge (Module ↔ 3-Level Workflow ↔ DAuth) ────────────────
export {
  executeLifecycleTransition,
  approveTransition,
  getTransitionRequirements,
  getPendingApprovals,
  getTransitionHistory,
} from './lifecycle';
export type {
  TransitionRequest,
  TransitionDecision,
  TransitionCheck,
  TransitionPolicy,
} from './lifecycle';
