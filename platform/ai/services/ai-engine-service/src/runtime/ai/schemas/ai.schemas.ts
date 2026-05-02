/**
 * Zod validation schemas for AI module.
 * Used with validate() middleware in ai route files.
 */

import { z } from 'zod';
import { paginationQuery, bulkIdsBody } from '../../../schemas/common.schemas';

export const createAgentBody = z.object({
  name: z.string().min(3).max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  model: z.string().max(100).optional(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const updateAgentBody = createAgentBody.partial();

export const listAgentsQuery = paginationQuery.extend({
  status: z.string().optional(),
});

export const chatBody = z.object({
  message: z.string().min(1).max(10000),
  context: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  agent_id: z.string().uuid().optional(),
});

export const bulkDeleteAgentsBody = bulkIdsBody;

// ── Bulk Operations ─────────────────────────────────────────────

export const bulkUpdateAgentsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateAgentBody,
});

// ── Legacy schemas (migrated from flat) ──

export const riskAssessmentParams = z.object({
  risk_id: z.string().uuid(),
  depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
});

export const gapAnalysisParams = z.object({
  framework_id: z.string().uuid(),
  scope: z.string().optional(),
});

export const generatePolicyBody = z.object({
  policy_type: z.string().min(1),
  framework_id: z.string().uuid().optional(),
  language: z.enum(['en', 'ar', 'both']).default('en'),
  context: z.string().optional(),
});

export const copilotQueryBody = z.object({
  query: z.string().min(1).max(2000),
  context_module: z.string().optional(),
  language: z.enum(['en', 'ar']).default('en'),
});

export const intentToQueryBody = z.object({
  query: z.string().min(1).max(2000),
  moduleCode: z.string().min(1).max(100),
  context: z.record(z.string(), z.unknown()).optional(),
  language: z.enum(['en', 'ar']).default('en'),
});

export const autoEvalBody = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  eval_type: z.string().optional(),
});


// ── Response Schemas ──────────────────────────────────────────
export const aiResponseSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string(),
  updated_by: z.string().optional(),
});

export const aiListResponseSchema = z.object({
  data: z.array(aiResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const aiEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('ai'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const aiStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const aiImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const aiImportBatchSchema = z.object({
  rows: z.array(aiImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const aiExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const aiAdminConfigSchema = z.object({
  moduleCode: z.literal('ai'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const aiBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const aiBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let systemsSystemIdFrameworksPostBody = z.object({
      frameworkCode: z.string().optional(),
      frameworkVersion: z.string().optional(),
    });

export type SystemsSystemIdFrameworksPostBodyInput = z.infer<typeof systemsSystemIdFrameworksPostBody>;

export let frameworksMappingIdStatusPatchBody = z.object({
      complianceStatus: z.string().optional(),
      assessmentDate: z.string().optional(),
      nextAssessmentDue: z.string().optional(),
      complianceNotes: z.string().optional(),
    });

export type FrameworksMappingIdStatusPatchBodyInput = z.infer<typeof frameworksMappingIdStatusPatchBody>;

export let frameworksMappingIdRiskClassificationPostBody = z.object({
      riskLevel: z.string().optional(),
      riskFactors: z.string().optional(),
      classificationNotes: z.string().optional(),
    });

export type FrameworksMappingIdRiskClassificationPostBodyInput = z.infer<typeof frameworksMappingIdRiskClassificationPostBody>;

export let systemsSystemIdDpiaPostBody = z.object({
      created_by: z.string().optional(),
    });

export type SystemsSystemIdDpiaPostBodyInput = z.infer<typeof systemsSystemIdDpiaPostBody>;

export let dpiaDpiaIdRiskFactorsPostBody = z.object({});

export type DpiaDpiaIdRiskFactorsPostBodyInput = z.infer<typeof dpiaDpiaIdRiskFactorsPostBody>;

export let dpiaDpiaIdSubmitPostBody = z.object({});

export type DpiaDpiaIdSubmitPostBodyInput = z.infer<typeof dpiaDpiaIdSubmitPostBody>;

export let dpiaDpiaIdReviewPostBody = z.object({
      decision: z.string().optional(),
      approvalNotes: z.string().optional(),
    });

export type DpiaDpiaIdReviewPostBodyInput = z.infer<typeof dpiaDpiaIdReviewPostBody>;

export let modelsModelVersionIdRiskScorePostBody = z.object({
      systemId: z.string().optional(),
    });

export type ModelsModelVersionIdRiskScorePostBodyInput = z.infer<typeof modelsModelVersionIdRiskScorePostBody>;

export let modelsModelVersionIdLifecyclePostBody = z.object({
      systemId: z.string().optional(),
      newState: z.string().optional(),
      transitionReason: z.string().optional(),
      requiresApproval: z.string().optional(),
    });

export type ModelsModelVersionIdLifecyclePostBodyInput = z.infer<typeof modelsModelVersionIdLifecyclePostBody>;

export let lifecycleLifecycleIdApprovePostBody = z.object({
      approvalNotes: z.string().optional(),
    });

export type LifecycleLifecycleIdApprovePostBodyInput = z.infer<typeof lifecycleLifecycleIdApprovePostBody>;

export let modelsModelVersionIdAssessmentsPostBody = z.object({
      systemId: z.string().optional(),
    });

export type ModelsModelVersionIdAssessmentsPostBodyInput = z.infer<typeof modelsModelVersionIdAssessmentsPostBody>;

export let grantPostBody = z.object({
      agentId: z.string().min(1),
      scopes: z.array(z.string()).min(1),
      durationMinutes: z.number().int().min(1).max(1440).optional(),
    }).strict();

export type GrantPostBodyInput = z.infer<typeof grantPostBody>;

export let onboardPostBody = z.object({
      agentId: z.string(),
      answers: z.array(z.unknown()).optional(),
      autoInfer: z.string().optional(),
    });

export type OnboardPostBodyInput = z.infer<typeof onboardPostBody>;

export let versionsPostBody = z.object({
      asset_id: z.string(),
      agent_config: z.string(),
      linked_prompt_asset_id: z.string().optional(),
      linked_model_asset_id: z.string().optional(),
      capabilities: z.string().optional(),
      change_summary: z.string().optional(),
      notes: z.string().optional(),
    });

export type VersionsPostBodyInput = z.infer<typeof versionsPostBody>;

export let versionsVersionIdPatchBody = z.object({});

export type VersionsVersionIdPatchBodyInput = z.infer<typeof versionsVersionIdPatchBody>;

export let versionsVersionIdSubmitPostBody = z.object({});

export type VersionsVersionIdSubmitPostBodyInput = z.infer<typeof versionsVersionIdSubmitPostBody>;

export let versionsVersionIdApprovePostBody = z.object({});

export type VersionsVersionIdApprovePostBodyInput = z.infer<typeof versionsVersionIdApprovePostBody>;

export let versionsVersionIdRejectPostBody = z.object({
      notes: z.string().optional(),
    });

export type VersionsVersionIdRejectPostBodyInput = z.infer<typeof versionsVersionIdRejectPostBody>;

export let versionsVersionIdActivatePostBody = z.object({});

export type VersionsVersionIdActivatePostBodyInput = z.infer<typeof versionsVersionIdActivatePostBody>;

export let versionsVersionIdSuspendPostBody = z.object({
      notes: z.string().optional(),
    });

export type VersionsVersionIdSuspendPostBodyInput = z.infer<typeof versionsVersionIdSuspendPostBody>;

export let versionsVersionIdRetirePostBody = z.object({
      notes: z.string().optional(),
    });

export type VersionsVersionIdRetirePostBodyInput = z.infer<typeof versionsVersionIdRetirePostBody>;

export let versionsAssetIdRollbackPostBody = z.object({
      target_version_id: z.string(),
      notes: z.string().optional(),
    });

export type VersionsAssetIdRollbackPostBodyInput = z.infer<typeof versionsAssetIdRollbackPostBody>;

export let agentsAgentIdPerformancePostBody = z.object({});

export type AgentsAgentIdPerformancePostBodyInput = z.infer<typeof agentsAgentIdPerformancePostBody>;

export let agentsAgentIdBiasDetectionPostBody = z.object({});

export type AgentsAgentIdBiasDetectionPostBodyInput = z.infer<typeof agentsAgentIdBiasDetectionPostBody>;

export let biasDetectionsDetectionIdRemediationPatchBody = z.object({
      remediationStatus: z.string().optional(),
      remediationNotes: z.string().optional(),
    });

export type BiasDetectionsDetectionIdRemediationPatchBodyInput = z.infer<typeof biasDetectionsDetectionIdRemediationPatchBody>;

export let agentsAgentIdTrustScorePostBody = z.object({});

export type AgentsAgentIdTrustScorePostBodyInput = z.infer<typeof agentsAgentIdTrustScorePostBody>;

export let agentsAgentIdHumanOverridesPostBody = z.object({
      decisionId: z.string().optional(),
      overrideReason: z.string().optional(),
      overrideAction: z.string().optional(),
    });

export type AgentsAgentIdHumanOverridesPostBodyInput = z.infer<typeof agentsAgentIdHumanOverridesPostBody>;

export let aiOsAgentsAgentIdDryRunPostBody = z.object({});

export type AiOsAgentsAgentIdDryRunPostBodyInput = z.infer<typeof aiOsAgentsAgentIdDryRunPostBody>;

export let aiOsAgentsAgentIdReplayRunIdPostBody = z.object({});

export type AiOsAgentsAgentIdReplayRunIdPostBodyInput = z.infer<typeof aiOsAgentsAgentIdReplayRunIdPostBody>;

export let rulesPostBody = z.object({});

export type RulesPostBodyInput = z.infer<typeof rulesPostBody>;

export let rulesRuleIdTogglePatchBody = z.object({
      enabled: z.boolean().optional(),
    });

export type RulesRuleIdTogglePatchBodyInput = z.infer<typeof rulesRuleIdTogglePatchBody>;

export let modelConfigAgentIdPutBody = z.object({});

export type ModelConfigAgentIdPutBodyInput = z.infer<typeof modelConfigAgentIdPutBody>;

export let budgetPutBody = z.object({
      monthlyTokenLimit: z.string().optional(),
      monthlyCostLimit: z.string().optional(),
      softLimitPct: z.string().optional(),
      hardLimitAction: z.string().optional(),
    });

export type BudgetPutBodyInput = z.infer<typeof budgetPutBody>;

export let promptsAssetIdPostBody = z.object({
      systemPrompt: z.string().optional(),
      template_text: z.string().optional(),
      description: z.string().optional(),
    });

export type PromptsAssetIdPostBodyInput = z.infer<typeof promptsAssetIdPostBody>;

export let promptsAssetIdActivateVersionIdPostBody = z.object({});

export type PromptsAssetIdActivateVersionIdPostBodyInput = z.infer<typeof promptsAssetIdActivateVersionIdPostBody>;

export let streamChatPostBody = z.object({
      message: z.string().optional(),
      systemPrompt: z.string().optional(),
      agentId: z.string().optional(),
    });

export type StreamChatPostBodyInput = z.infer<typeof streamChatPostBody>;

export let evalsRunPostBody = z.object({
      sampleSize: z.string().optional(),
    });

export type EvalsRunPostBodyInput = z.infer<typeof evalsRunPostBody>;

export let memoryCompactPostBody = z.object({});

export type MemoryCompactPostBodyInput = z.infer<typeof memoryCompactPostBody>;

export let selfImprovePostBody = z.object({});

export type SelfImprovePostBodyInput = z.infer<typeof selfImprovePostBody>;

export let feedbackPostBody = z.object({
      agentId: z.string(),
      rating: z.string(),
      runId: z.string().optional(),
      comment: z.string().optional(),
    });

export type FeedbackPostBodyInput = z.infer<typeof feedbackPostBody>;

export let proposedActionsIdPutBody = z.object({
      status: z.string().optional(),
      reviewNotes: z.string().optional(),
    });

export type ProposedActionsIdPutBodyInput = z.infer<typeof proposedActionsIdPutBody>;

export let explainabilityPostBody = z.object({
      systemId: z.string().optional(),
      decisionId: z.string().optional(),
    });

export type ExplainabilityPostBodyInput = z.infer<typeof explainabilityPostBody>;

export let explainabilityRecordIdReviewPostBody = z.object({
      reviewStatus: z.string().optional(),
      reviewNotes: z.string().optional(),
    });

export type ExplainabilityRecordIdReviewPostBodyInput = z.infer<typeof explainabilityRecordIdReviewPostBody>;

export let explainabilityRecordIdCounterfactualPostBody = z.object({
      scenarioDescription: z.string().optional(),
      alternativeInputs: z.string().optional(),
      predictedOutcome: z.string().optional(),
    });

export type ExplainabilityRecordIdCounterfactualPostBodyInput = z.infer<typeof explainabilityRecordIdCounterfactualPostBody>;

export let entityTypeEntityIdReviewPostBody = z.object({
      decision: z.string(),
      toState: z.string().optional(),
    });

export type EntityTypeEntityIdReviewPostBodyInput = z.infer<typeof entityTypeEntityIdReviewPostBody>;

export let batchReviewPostBody = z.object({
      decision: z.string(),
      items: z.array(z.unknown()).optional(),
    });

export type BatchReviewPostBodyInput = z.infer<typeof batchReviewPostBody>;

export let autoEscalatePostBody = z.object({
      slaHours: z.string().optional(),
    });

export type AutoEscalatePostBodyInput = z.infer<typeof autoEscalatePostBody>;

export let assignPostBody = z.object({});

export type AssignPostBodyInput = z.infer<typeof assignPostBody>;

export let myAgentAgentIdPatchBody = z.object({});

export type MyAgentAgentIdPatchBodyInput = z.infer<typeof myAgentAgentIdPatchBody>;

export let consentPostBody = z.object({
      agentId: z.string(),
      granted: z.string().optional(),
      purpose: z.string().optional(),
    });

export type ConsentPostBodyInput = z.infer<typeof consentPostBody>;

export let executePostBody = z.object({
      agentId: z.string(),
      activityType: z.string(),
      activityCategory: z.string(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      actionTitle: z.string().optional(),
      actionDescription: z.string().optional(),
      actionPayload: z.string().optional(),
      processId: z.string().optional(),
      processStep: z.string().optional(),
      riskLevel: z.string().optional(),
      slaDeadline: z.string().optional(),
    });

export type ExecutePostBodyInput = z.infer<typeof executePostBody>;

export let activitiesActivityIdApprovePostBody = z.object({});

export type ActivitiesActivityIdApprovePostBodyInput = z.infer<typeof activitiesActivityIdApprovePostBody>;

export let activitiesActivityIdRejectPostBody = z.object({
      reason: z.string(),
    });

export type ActivitiesActivityIdRejectPostBodyInput = z.infer<typeof activitiesActivityIdRejectPostBody>;

export let checkSlaPostBody = z.object({});

export type CheckSlaPostBodyInput = z.infer<typeof checkSlaPostBody>;

export let activitiesActivityIdConfirmPostBody = z.object({
      approved: z.boolean().optional(),
      reason: z.string().optional(),
      notes: z.string().optional(),
      riskAssessment: z.string().optional(),
      complianceNotes: z.string().optional(),
      overridePolicy: z.string().optional(),
      overrideReason: z.string().optional(),
    });

export type ActivitiesActivityIdConfirmPostBodyInput = z.infer<typeof activitiesActivityIdConfirmPostBody>;

export let seedPostBody = z.object({});

export type SeedPostBodyInput = z.infer<typeof seedPostBody>;

export let participantsPostBody = z.object({
      userId: z.string(),
      displayNameEn: z.string(),
      displayNameAr: z.string(),
      role: z.string(),
      deploymentMode: z.string().optional(),
      capabilities: z.string().optional(),
      isAgent: z.string().optional(),
      specialization: z.string().optional(),
      deliveryChannel: z.string().optional(),
      webhookUrl: z.string().optional(),
    });

export type ParticipantsPostBodyInput = z.infer<typeof participantsPostBody>;

export let participantsIdStatusPutBody = z.object({
      status: z.string().optional(),
    });

export type ParticipantsIdStatusPutBodyInput = z.infer<typeof participantsIdStatusPutBody>;

export let syncPostBody = z.object({
      instanceId: z.string().optional(),
      roster: z.string().optional(),
    });

export type SyncPostBodyInput = z.infer<typeof syncPostBody>;

export let intervenePostBody = z.object({});

export type IntervenePostBodyInput = z.infer<typeof intervenePostBody>;

export let handoffPostBody = z.object({});

export type HandoffPostBodyInput = z.infer<typeof handoffPostBody>;

export let erpConnectionsPostBody = z.object({});

export type ErpConnectionsPostBodyInput = z.infer<typeof erpConnectionsPostBody>;

export let erpConnectionsIdPutBody = z.object({});

export type ErpConnectionsIdPutBodyInput = z.infer<typeof erpConnectionsIdPutBody>;

export let erpConnectionsIdValidatePostBody = z.object({});

export type ErpConnectionsIdValidatePostBodyInput = z.infer<typeof erpConnectionsIdValidatePostBody>;

export let erpConnectionsIdMappingsPostBody = z.object({});

export type ErpConnectionsIdMappingsPostBodyInput = z.infer<typeof erpConnectionsIdMappingsPostBody>;

export let erpConnectionsIdSyncPostBody = z.object({});

export type ErpConnectionsIdSyncPostBodyInput = z.infer<typeof erpConnectionsIdSyncPostBody>;

export let agentsSeedPostBody = z.object({});

export type AgentsSeedPostBodyInput = z.infer<typeof agentsSeedPostBody>;

export let agentsIdStatusPutBody = z.object({
      status: z.string().optional(),
    });

export type AgentsIdStatusPutBodyInput = z.infer<typeof agentsIdStatusPutBody>;

export let configPutBody = z.object({});

export type ConfigPutBodyInput = z.infer<typeof configPutBody>;

export let evaluatePostBody = z.object({});

export type EvaluatePostBodyInput = z.infer<typeof evaluatePostBody>;

export let rootPostBody = z.object({
      name: z.string(),
      event_type: z.string().optional(),
      condition: z.string().optional(),
      action_type: z.string().optional(),
      enabled: z.boolean().optional(),
    });

export type RootPostBodyInput = z.infer<typeof rootPostBody>;

export let idPutBody = z.object({
      condition: z.string().optional(),
    });

export type IdPutBodyInput = z.infer<typeof idPutBody>;

export let idTestPostBody = z.object({});

export type IdTestPostBodyInput = z.infer<typeof idTestPostBody>;

export let testAllPostBody = z.object({});

export type TestAllPostBodyInput = z.infer<typeof testAllPostBody>;

// ── Auto-generated validation schemas (enterprise hardening) ──

export const updateConfigBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReseedBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReindexBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createBackfillBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createExplainBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createKillBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRebootBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPauseBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createResumeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSnapshotBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAutonomyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPriorityBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createGlobalAutonomyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createOptimizeRoutingBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAiAssignBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAiRebalanceBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createVersionsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateVersionsBody = createVersionsBody.partial();

export const createSubmitBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createApproveBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRejectBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createActivateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSuspendBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRetireBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRollbackBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createQueryBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});


export const updateAiBody = (..._args: any[]): any => { return {} as any; };
export const createTriggerBody = (..._args: any[]): any => { return {} as any; };

// ── Kernel Admin Schemas (Enterprise Hardened) ──
export const kernelProcessIdParams = z.object({
  pid: z.string().min(1, "PID is required"),
});

export const kernelAgentIdParams = z.object({
  agentId: z.string().min(1, "Agent ID is required"),
});

export const kernelStatusResponseSchema = z.object({
  uptime: z.string(),
  memoryPressure: z.string(),
  schedulerLoad: z.number(),
  resourceUsage: z.object({
    tokenUtilization: z.number(),
    tokensUsed24h: z.number(),
    avgLatencyMs: z.number(),
    errorRate: z.number()
  })
});

export const kernelProcessSchema = z.object({
  pid: z.string(),
  agentId: z.string(),
  state: z.enum(['running', 'queued', 'blocked', 'completed', 'failed', 'cancelled']),
  priority: z.string(),
  durationMs: z.number().nullable(),
  memoryUsed: z.number(),
  exitCode: z.number().nullable()
});

export const kernelAutonomyBody = z.object({
  level: z.enum(['high', 'standard', 'shadow', 'disabled'])
});
export const createExecuteActionBody = (..._args: any[]): any => { return {} as any; };
export const updateCancelAutoBody = (..._args: any[]): any => { return {} as any; };

// ── Copilot schema aliases (referenced by copilot.routes.ts) ─────────────
export const createChatBody = chatBody;
export const createPublicChatBody = z.object({
  message: z.string().min(1).max(5000).optional(),
  query: z.string().min(1).max(5000).optional(),
  agentId: z.string().regex(/^A[0-9]{2}$/).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  // Phase 2 — A13 graduates from anonymous Q&A to lead capture. Optional
  // contact fields persist to public.copilot_leads when intent is non-general.
  // Email is `string().max(...)` (not `.email()`) so a malformed value
  // does NOT 400 the chat itself — we soft-validate downstream and skip
  // the lead-capture row if email is unparseable.
  email: z.string().max(255).optional(),
  company: z.string().min(1).max(255).optional(),
  roleTitle: z.string().min(1).max(120).optional(),
}).refine((b) => typeof b.message === 'string' || typeof b.query === 'string', {
  message: 'message or query is required',
  path: ['message'],
});
export const updateApproveBody = z.object({ reason: z.string().optional() });
export const updateRejectBody = z.object({ reason: z.string().min(1) });
