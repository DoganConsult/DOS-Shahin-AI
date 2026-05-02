import { safeQuery } from "@dos/db";

export { startWorkflowExecution, advanceStep, completeStep, cancelExecution, getInstanceStatus } from '../../ports/lifecycle.port';
export type { StartResult, AdvanceResult, EngineStep } from '../../ports/lifecycle.port';

export { startModuleWorkflow, WorkflowTemplateNotFoundError } from '../templates/workflow-templates.service';

export { bumpWorkflowVersion, snapshotGraph, getGraphVersions, getGraphVersion } from '../templates/workflow-versioning.service';
export type { GraphVersion } from '../templates/workflow-versioning.service';

export {
  loadChainDefinition,
  startChain,
  advanceChainStep,
  getChainInstances,
  getChainStepLog,
  checkSodViolation,
  cancelChain,
} from '../chains/chain-core';
export type { ChainDefinition, ChainInstance, ChainStep, StartChainResult, AdvanceChainResult, SodCheckResult } from '../chains/chain-core';

export { createProcessTask } from '../../ports/lifecycle.port';
export type { ProcessTaskType } from '../../ports/lifecycle.port';

export { emitWorkflowEvent } from '../../ports/lifecycle.port';

export { createWorkflowComment, getCommentsByInstance, updateComment, deleteComment } from '../ops/workflow-comments.service';
export { addAttachment, getAttachmentsByInstance, removeAttachment } from '../ops/workflow-attachments.service';
export { createAINote, getNotesByInstance, reviewAINote, getPendingReviewNotes } from '../ai/workflow-ai-notes.service';
export { createDraftAction, getDraftsByInstance, acceptDraft, rejectDraft, convertDraft, getPendingDrafts } from '../approvals/workflow-draft-actions.service';
export { getCatalog, getCatalogEntry, upsertCatalogEntry, getApplicableRecommendations } from '../ai/workflow-recommendation-catalog.service';
export { getBoundaries, checkBoundaries, createBoundary, deactivateBoundary } from '../ops/workflow-forbidden-boundaries.service';
export { getWorkflowAIPolicy, upsertWorkflowAIPolicy, resolveEffectiveAIPolicy } from '../ai/workflow-ai-policy.service';
export { getReviewPoints, checkReviewRequired, upsertReviewPoint } from '../approvals/workflow-mandatory-review.service';
export { activateKillSwitch, deactivateKillSwitch, getActiveKillSwitches, isKillSwitchActive, logIntervention, getInterventionLog, acknowledgeIntervention } from '../ops/workflow-kill-switch.service';
export { initiateRollback, executeRollback, getRollbacksByInstance, getPendingRollbacks, getCompensatingAction } from '../ops/workflow-rollback.service';
export { getBudget, checkBudget, recordExecution, upsertBudget } from '../ai/workflow-ai-budget.service';
export { getStepAutonomyScopes, checkStepAutonomy, upsertStepAutonomy, deactivateStepAutonomy } from '../ai/workflow-step-autonomy.service';

export {
  AGENT_MODULE_BINDING, getAgentForModule, getModulesForAgent, isAgentBoundToModule,
  MODULE_SLA_CONFIG, getModuleSLAConfig,
  MODULE_COMPENSATION_REGISTRY, getModuleCompensatingAction,
  CROSS_MODULE_CHAIN_TEMPLATES, getCrossModuleChainTemplate, getChainTemplatesForModule,
  resolveModuleAIPolicy, runAIGateChecks, getModuleWorkflowHealth,
  emitModuleWorkflowEvent, createModuleAINote, createModuleDraftAction, getModuleRecommendations,
} from '../chains/module-workflow-integration.service';
export type { ModuleSLAConfig, CrossModuleChainTemplate, ModuleAIPolicyResult, AIGateCheckResult, ModuleWorkflowHealthResult } from '../chains/module-workflow-integration.service';

export {
  preflightAIOperation, emitModuleEvent, recordModuleAudit,
  createModuleNote, createModuleDraft, getModuleAIStatus,
  onModuleEntityCreate, onModuleEntityUpdate, onModuleEntityDelete,
  onModuleStatusChange, suggestAIAction,
  getModuleAICapabilities, getAllModuleAICapabilities,
} from '../ai/module-ai-orchestrator.service';
export type { ModuleAIContext, AIOperationResult, ModuleAICapabilities } from '../ai/module-ai-orchestrator.service';
