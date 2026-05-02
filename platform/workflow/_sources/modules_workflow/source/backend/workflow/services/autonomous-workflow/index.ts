import { safeQuery } from "@dos/db";

// ============================================================
// Shahin — Autonomous Workflow: Barrel Re-export
// All public exports from the autonomous-workflow sub-modules.
// This preserves the original module's public API.
// ============================================================

export { TENANT_ID_RE, acquireTenantLock, releaseTenantLock } from './tenant-lock';

export {
  COACHING_PROMPT_PREFIX,
  isStepOverdue,
  isUserAbsent,
  detectWorkloadOverload,
  detectExpertiseMismatch,
  detectPatternMatch,
  detectLowRiskAction,
  detectRecurringTask,
} from './detection-triggers';

export {
  AUTONOMY_CONFIDENCE_THRESHOLDS,
  calculateConfidence,
  shouldAITakeOver,
} from './confidence-decision';

export {
  executeStepWithAgent,
  processAutonomousSteps,
} from './agent-execution';

export {
  mapRowToExecution,
  getAIQueue,
  reviewAIStep,
} from './review-queue';

export {
  setUserAbsence,
  getAutonomousConfig,
  updateAutonomousConfig,
} from './config-state';

export {
  generateStepGuidance,
  generateStepAutofill,
  recordFeedback,
} from './ai-guidance';

export type {
  AutonomousChainStep,
  AutonomousChainResult,
} from './autonomous-chain';

export {
  executeAutonomousChain,
} from './autonomous-chain';

export { isKillSwitchActive, activateKillSwitch, deactivateKillSwitch, logIntervention, getInterventionLog, acknowledgeIntervention } from '../ops/workflow-kill-switch.service';
export { checkBudget, recordExecution, getBudget, upsertBudget } from '../ai/workflow-ai-budget.service';
export { checkBoundaries, getBoundaries, createBoundary } from '../ops/workflow-forbidden-boundaries.service';
export { checkStepAutonomy, getStepAutonomyScopes, upsertStepAutonomy } from '../ai/workflow-step-autonomy.service';
export { checkReviewRequired, getReviewPoints, upsertReviewPoint } from '../approvals/workflow-mandatory-review.service';
export { initiateRollback, executeRollback, getRollbacksByInstance, getCompensatingAction } from '../ops/workflow-rollback.service';
export { createAINote, getNotesByInstance, reviewAINote } from '../ai/workflow-ai-notes.service';
export { createDraftAction, getDraftsByInstance, acceptDraft, rejectDraft } from '../approvals/workflow-draft-actions.service';
export { resolveEffectiveAIPolicy, getWorkflowAIPolicy, upsertWorkflowAIPolicy } from '../ai/workflow-ai-policy.service';
