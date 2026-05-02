import { safeQuery } from "@dos/db";

// ============================================================
// Shahin — Autonomous Workflow Service (barrel re-export)
// Split into focused sub-modules under ./autonomous-workflow/
// This file preserves the original public API for all consumers.
// ============================================================

export {
  // tenant-lock
  TENANT_ID_RE,
  acquireTenantLock,
  releaseTenantLock,

  // detection-triggers
  COACHING_PROMPT_PREFIX,
  isStepOverdue,
  isUserAbsent,
  detectWorkloadOverload,
  detectExpertiseMismatch,
  detectPatternMatch,
  detectLowRiskAction,
  detectRecurringTask,

  // confidence-decision
  AUTONOMY_CONFIDENCE_THRESHOLDS,
  calculateConfidence,
  shouldAITakeOver,

  // agent-execution
  executeStepWithAgent,
  processAutonomousSteps,

  // review-queue
  mapRowToExecution,
  getAIQueue,
  reviewAIStep,

  // config-state
  setUserAbsence,
  getAutonomousConfig,
  updateAutonomousConfig,

  // ai-guidance
  generateStepGuidance,
  generateStepAutofill,
  recordFeedback,

  // autonomous-chain
  executeAutonomousChain,
} from '../autonomous-workflow/index';

export type {
  AutonomousChainStep,
  AutonomousChainResult,
} from '../autonomous-workflow/index';
