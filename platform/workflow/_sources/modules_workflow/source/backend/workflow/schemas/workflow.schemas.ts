/**
 * Zod validation schemas for Workflow module.
 * Used with validate() middleware in workflow route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold', 'blocked', 'draft', 'active'] as const;
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export const createWorkflowBody = z.object({
  name: z.string().min(3).max(255),
  template_id: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).default('draft'),
  owner: z.string().optional(),
  due_date: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const updateWorkflowBody = createWorkflowBody.partial();

export const listWorkflowsQuery = paginationQuery.merge(statusFilter).extend({
  template_id: z.string().optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
  module_code: z.string().optional(),
});

export const createWorkflowTemplateBody = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  steps: z.array(z.object({
    step_order: z.coerce.number().int().min(1),
    step_type: z.enum(['action', 'approval', 'notification', 'condition', 'parallel']).optional(),
    label: z.string().max(255).optional(),
    assignee_role: z.string().max(100).optional(),
    sla_hours: z.coerce.number().min(0).optional(),
    config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })).optional(),
});

export const updateWorkflowTemplateBody = createWorkflowTemplateBody.partial();

export const workflowTransitionBody = z.object({
  to_status: z.string().min(1),
  comment: z.string().optional(),
});

export const bulkDeleteWorkflowsBody = bulkIdsBody;

// -- Legacy schemas (migrated from flat) --

export const saveWorkflowBody = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  trigger_event: z.string().optional(),
  module_code: z.string().optional(),
  steps: z.array(z.object({
    step_order: z.coerce.number().int().min(1),
    step_type: z.enum(['action', 'approval', 'notification', 'condition', 'parallel']).optional(),
    label: z.string().max(255).optional(),
    assignee_role: z.string().max(100).optional(),
    sla_hours: z.coerce.number().min(0).optional(),
    config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })).optional(),
  enabled: z.boolean().default(true),
});

export const createApprovalStepBody = z.object({
  workflow_id: z.string().uuid(),
  step_order: z.coerce.number().int().min(1),
  approver_role: z.string().min(1),
  approval_type: z.enum(['single', 'majority', 'unanimous']).default('single'),
  sla_hours: z.coerce.number().min(1).optional(),
});

export const instantiateTemplateBody = z.object({
  template_key: z.string().min(1),
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement inline validation in routes Use listWorkflowsQuery instead */
export const listWorkflowQuery = listWorkflowsQuery;


// ── Response Schemas ──────────────────────────────────────────
export const workflowResponseSchema = z.object({
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

export const workflowListResponseSchema = z.object({
  data: z.array(workflowResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const workflowEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('workflow'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const workflowStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const workflowImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const workflowImportBatchSchema = z.object({
  rows: z.array(workflowImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const workflowExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const workflowAdminConfigSchema = z.object({
  moduleCode: z.literal('workflow'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const workflowBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const workflowBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createRootBody = z.object({
      title: z.unknown().optional(),
      description: z.unknown().optional(),
      entity_type: z.unknown().optional(),
      priority: z.unknown().optional(),
      assigned_to: z.unknown().optional(),
      assigned_team_id: z.unknown().optional(),
      sla_hours: z.unknown().optional(),
      escalation_chain: z.unknown().optional(),
      entity_id: z.unknown().optional(),
      action: z.unknown().optional(),
      route_id: z.unknown().optional(),
    });

export type CreateRootBodyInput = z.infer<typeof createRootBody>;

export let updateIdAcceptBody = z.object({});

export type UpdateIdAcceptBodyInput = z.infer<typeof updateIdAcceptBody>;

export let updateIdApproveBody = z.object({
      comment: z.unknown().optional(),
      reason: z.unknown().optional(),
    });

export type UpdateIdApproveBodyInput = z.infer<typeof updateIdApproveBody>;

export let updateIdRejectBody = z.object({
      comment: z.unknown().optional(),
      reason: z.unknown().optional(),
    });

export type UpdateIdRejectBodyInput = z.infer<typeof updateIdRejectBody>;

export let updateIdReassignBody = z.object({
      assigned_to: z.string().min(1),
      assigned_team_id: z.unknown().optional(),
    });

export type UpdateIdReassignBodyInput = z.infer<typeof updateIdReassignBody>;

export let updateIdEscalateBody = z.object({});

export type UpdateIdEscalateBodyInput = z.infer<typeof updateIdEscalateBody>;

export let createInitiateBody = z.object({
      entityType: z.string().min(1),
      entityId: z.unknown().optional(),
      action: z.unknown().optional(),
      routeId: z.unknown().optional(),
      context: z.unknown().optional(),
    });

export type CreateInitiateBodyInput = z.infer<typeof createInitiateBody>;

export let createRequestsidDecideBody = z.object({
      decision: z.string().min(1),
      reason: z.unknown().optional(),
      delegateTo: z.unknown().optional(),
    });

export type CreateRequestsidDecideBodyInput = z.infer<typeof createRequestsidDecideBody>;

export let autonomousConfigSchema = z.object({
      enabled: z.boolean().optional(),
      slaGraceMultiplier: z.number().min(0.1).max(10).optional(),
      aiCanExecuteActions: z.boolean().optional(),
      aiCanDraftApprovals: z.boolean().optional(),
      requireHumanReview: z.boolean().optional(),
      cronIntervalMinutes: z.number().int().min(1).max(1440).optional(),
    });

export type AutonomousConfigSchemaInput = z.infer<typeof autonomousConfigSchema>;

export let feedbackSchema = z.object({
      suggestionType: z.enum(["guidance", "autofill"]),
      accepted: z.boolean(),
      modified: z.boolean().optional(),
    });

export type FeedbackSchemaInput = z.infer<typeof feedbackSchema>;

export let bulkStatusBody = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(100),
      status: z.enum(VALID_STATUSES),
    });

export type BulkStatusBodyInput = z.infer<typeof bulkStatusBody>;

export let bulkReassignBody = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(100),
      assigneeUserId: z.string().uuid(),
    });

export type BulkReassignBodyInput = z.infer<typeof bulkReassignBody>;

export let bulkCancelBody = z.object({
      taskIds: z.array(z.string().uuid()).min(1).max(100),
    });

export type BulkCancelBodyInput = z.infer<typeof bulkCancelBody>;

export let createTriageGenerateBody = z.object({});

export type CreateTriageGenerateBodyInput = z.infer<typeof createTriageGenerateBody>;

export let createTriageProposalsidResolveBody = z.object({});

export type CreateTriageProposalsidResolveBodyInput = z.infer<typeof createTriageProposalsidResolveBody>;

export let createCodraftSessionsBody = z.object({});

export type CreateCodraftSessionsBodyInput = z.infer<typeof createCodraftSessionsBody>;

export let createCodraftSessionsidResolveBody = z.object({});

export type CreateCodraftSessionsidResolveBodyInput = z.infer<typeof createCodraftSessionsidResolveBody>;

export let createCodraftSessionsidFinalizeBody = z.object({});

export type CreateCodraftSessionsidFinalizeBodyInput = z.infer<typeof createCodraftSessionsidFinalizeBody>;

export let createEvidencerelayStageBody = z.object({
      items: z.unknown().optional(),
    });

export type CreateEvidencerelayStageBodyInput = z.infer<typeof createEvidencerelayStageBody>;

export let createEvidencerelayidReviewBody = z.object({});

export type CreateEvidencerelayidReviewBodyInput = z.infer<typeof createEvidencerelayidReviewBody>;

export let createRiskpairAssessBody = z.object({});

export type CreateRiskpairAssessBodyInput = z.infer<typeof createRiskpairAssessBody>;

export let createRiskpairReviewsidHumanBody = z.object({});

export type CreateRiskpairReviewsidHumanBodyInput = z.infer<typeof createRiskpairReviewsidHumanBody>;

export let createRiskpairReviewsidDialogueBody = z.object({});

export type CreateRiskpairReviewsidDialogueBodyInput = z.infer<typeof createRiskpairReviewsidDialogueBody>;

export let createRiskpairReviewsidFinalizeBody = z.object({});

export type CreateRiskpairReviewsidFinalizeBodyInput = z.infer<typeof createRiskpairReviewsidFinalizeBody>;

export let createApprovalprescreenapprovalIdBody = z.object({});

export type CreateApprovalprescreenapprovalIdBodyInput = z.infer<typeof createApprovalprescreenapprovalIdBody>;

export let createWarroomsBody = z.object({});

export type CreateWarroomsBodyInput = z.infer<typeof createWarroomsBody>;

export let createWarroomsidClaimBody = z.object({});

export type CreateWarroomsidClaimBodyInput = z.infer<typeof createWarroomsidClaimBody>;

export let createWarroomsidContainmentstepIdBody = z.object({});

export type CreateWarroomsidContainmentstepIdBodyInput = z.infer<typeof createWarroomsidContainmentstepIdBody>;

export let createWarroomsidTimelineBody = z.object({});

export type CreateWarroomsidTimelineBodyInput = z.infer<typeof createWarroomsidTimelineBody>;

export let createWarroomsidResolveBody = z.object({});

export type CreateWarroomsidResolveBodyInput = z.infer<typeof createWarroomsidResolveBody>;

export let createNudgefeedbackBody = z.object({});

export type CreateNudgefeedbackBodyInput = z.infer<typeof createNudgefeedbackBody>;

export let createCalibrationProposevendorIdBody = z.object({});

export type CreateCalibrationProposevendorIdBodyInput = z.infer<typeof createCalibrationProposevendorIdBody>;

export let createCalibrationsidSubmitBody = z.object({});

export type CreateCalibrationsidSubmitBodyInput = z.infer<typeof createCalibrationsidSubmitBody>;

export let createCalibrationsidAcceptBody = z.object({});

export type CreateCalibrationsidAcceptBodyInput = z.infer<typeof createCalibrationsidAcceptBody>;

export let createAuditprepGenerateBody = z.object({});

export type CreateAuditprepGenerateBodyInput = z.infer<typeof createAuditprepGenerateBody>;

export let createAuditprepChecklistsidItemsBody = z.object({});

export type CreateAuditprepChecklistsidItemsBodyInput = z.infer<typeof createAuditprepChecklistsidItemsBody>;

export let createAuditprepChecklistsidItemsitemIdReadyBody = z.object({});

export type CreateAuditprepChecklistsidItemsitemIdReadyBodyInput = z.infer<typeof createAuditprepChecklistsidItemsitemIdReadyBody>;

export let updateAuditprepChecklistsidStatusBody = z.object({
      status: z.unknown().optional(),
    });

export type UpdateAuditprepChecklistsidStatusBodyInput = z.infer<typeof updateAuditprepChecklistsidStatusBody>;

export let createStandupGenerateBody = z.object({});

export type CreateStandupGenerateBodyInput = z.infer<typeof createStandupGenerateBody>;

export let createStandupDigestsidAcknowledgeBody = z.object({
      priorities: z.unknown().optional(),
    });

export type CreateStandupDigestsidAcknowledgeBodyInput = z.infer<typeof createStandupDigestsidAcknowledgeBody>;

export let setupAnswerBody = z.object({
      stepId: z.string().min(1),
      answer: z.record(z.string(), z.unknown()).optional(),
    });

export type SetupAnswerBodyInput = z.infer<typeof setupAnswerBody>;

export let updateTaskStatusBody = z.object({
      status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    });

export type UpdateTaskStatusBodyInput = z.infer<typeof updateTaskStatusBody>;

export let activateTemplateBody = z.object({
      phaseType: z.string().min(1).max(100),
    });

export type ActivateTemplateBodyInput = z.infer<typeof activateTemplateBody>;

export let instantiateProcessBody = z.object({
      teamSize: z.coerce.number().int().min(1).max(10000).optional(),
    });

export type InstantiateProcessBodyInput = z.infer<typeof instantiateProcessBody>;

export let preflightBody = z.object({
      moduleCode: z.string().max(50),
      stepType: z.string().max(100),
      entityType: z.string().max(100),
      entityId: z.string().uuid().optional(),
      instanceId: z.string().uuid().optional(),
      workflowId: z.string().uuid().optional(),
    });

export type PreflightBodyInput = z.infer<typeof preflightBody>;

export let suggestBody = z.object({
      moduleCode: z.string().max(50),
      stepType: z.string().max(100),
      entityType: z.string().max(100),
      entityId: z.string().uuid().optional(),
      instanceId: z.string().uuid().optional(),
      actionDescription: z.string().max(2000),
      confidence: z.number().min(0).max(1),
    });

export type SuggestBodyInput = z.infer<typeof suggestBody>;

export let noteBody = z.object({
      moduleCode: z.string().max(50),
      stepType: z.string().max(100),
      entityType: z.string().max(100),
      entityId: z.string().uuid().optional(),
      instanceId: z.string().uuid().optional(),
      noteType: z.enum(['guidance', 'autofill', 'recommendation', 'summary', 'coaching', 'warning']),
      content: z.record(z.string(), z.unknown()),
      confidence: z.number().min(0).max(1).optional(),
      trustLevel: z.enum(['assistive', 'advisory', 'authoritative']).optional(),
    });

export type NoteBodyInput = z.infer<typeof noteBody>;

export let draftBody = z.object({
      moduleCode: z.string().max(50),
      stepType: z.string().max(100),
      entityType: z.string().max(100),
      entityId: z.string().uuid().optional(),
      instanceId: z.string().uuid().optional(),
      draftType: z.enum(['task', 'email', 'response', 'approval', 'entity_update', 'escalation']),
      title: z.string().max(500),
      draftContent: z.record(z.string(), z.unknown()),
      confidence: z.number().min(0).max(1).optional(),
    });

export type DraftBodyInput = z.infer<typeof draftBody>;

export let startBody = z.object({
      moduleCode: z.string().min(1),
      entityId: z.string().optional(),
      context: z.record(z.string(), z.unknown()).optional(),
    });

export type StartBodyInput = z.infer<typeof startBody>;

export let instancesQuery = z.object({
      moduleCode: z.string().min(1),
      status: z.string().optional(),
    });

export type InstancesQueryInput = z.infer<typeof instancesQuery>;

export let taskListQuery = z.object({
      status: z.enum(VALID_STATUSES).optional(),
      teamId: z.string().uuid().optional(),
      assignedTo: z.string().optional(),
      priority: z.enum(VALID_PRIORITIES).optional(),
      role: z.string().optional(),
      /** Canonical GRC module code — matches process_tasks.entity_type for chain / module-scoped tasks */
      moduleCode: z.string().min(1).optional(),
      page: z.string().optional(),
      pageSize: z.string().optional(),
      limit: z.string().optional(),
      offset: z.string().optional(),
      sortBy: z.string().optional(),
      sortDir: z.string().optional(),
      sort: z.string().optional(),
      order: z.string().optional(),
    });

export type TaskListQueryInput = z.infer<typeof taskListQuery>;

export let taskIdParam = z.object({ id: z.string().uuid() });

export type TaskIdParamInput = z.infer<typeof taskIdParam>;

export let taskIdParamAlt = z.object({ taskId: z.string().uuid() });

export type TaskIdParamAltInput = z.infer<typeof taskIdParamAlt>;

export let statusUpdateBody = z.object({
      status: z.enum(VALID_STATUSES),
      completionEvidence: z.unknown().optional(),
    });

export type StatusUpdateBodyInput = z.infer<typeof statusUpdateBody>;

export let slaBreachesQuery = z.object({
      since: z.string().optional(),
    });

export type SlaBreachesQueryInput = z.infer<typeof slaBreachesQuery>;

export let createTasksBody = z.object({
      title: z.string().min(1),
      description: z.unknown().optional(),
      assignedTo: z.unknown().optional(),
      dueDate: z.unknown().optional(),
      entityType: z.unknown().optional(),
      entityId: z.unknown().optional(),
    });

export type CreateTasksBodyInput = z.infer<typeof createTasksBody>;

export let updateTasksidStatusBody = z.object({
      status: z.string().min(1),
    });

export type UpdateTasksidStatusBodyInput = z.infer<typeof updateTasksidStatusBody>;

export let idClaimPostBody = z.object({});

export type IdClaimPostBodyInput = z.infer<typeof idClaimPostBody>;

export let idCompletePostBody = z.object({
      outcome: z.string().optional(),
      comment: z.string().optional(),
    });

export type IdCompletePostBodyInput = z.infer<typeof idCompletePostBody>;

export let startInstanceBody = z.object({
      definitionId: z.string().min(1),
      context: z.record(z.string(), z.unknown()).optional(),
    });

export type StartInstanceBodyInput = z.infer<typeof startInstanceBody>;

export let changeStatusBody = z.object({
      status: z.enum(['active', 'template', 'archived', 'draft']),
    });

export type ChangeStatusBodyInput = z.infer<typeof changeStatusBody>;

export let executeWorkflowBody = z.object({
      triggerType: z.string().optional(),
      data: z.record(z.string(), z.unknown()).optional(),
      simulate: z.boolean().optional(),
    });

export type ExecuteWorkflowBodyInput = z.infer<typeof executeWorkflowBody>;

export let resumeWorkflowBody = z.object({
      executionId: z.string().min(1),
    });

export type ResumeWorkflowBodyInput = z.infer<typeof resumeWorkflowBody>;

export let simulateWorkflowBody = z.object({
      testData: z.record(z.string(), z.unknown()).optional(),
    });

export type SimulateWorkflowBodyInput = z.infer<typeof simulateWorkflowBody>;

export let createNoteBody = z.object({
      instanceId: z.string().uuid(),
      stepId: z.string().uuid().optional(),
      agentId: z.string().max(20),
      noteType: z.enum(['guidance', 'autofill', 'recommendation', 'summary', 'coaching', 'warning']),
      content: z.record(z.string(), z.unknown()),
      confidence: z.number().min(0).max(1).optional(),
      trustLevel: z.enum(['assistive', 'advisory', 'authoritative']).optional(),
      disclaimer: z.string().max(2000).optional(),
      reviewRequired: z.boolean().optional(),
      contextSources: z.array(z.string()).optional(),
    });

export type CreateNoteBodyInput = z.infer<typeof createNoteBody>;

export let createDraftBody = z.object({
      instanceId: z.string().uuid(),
      stepId: z.string().uuid().optional(),
      agentId: z.string().max(20),
      draftType: z.enum(['task', 'email', 'response', 'approval', 'entity_update', 'escalation']),
      title: z.string().min(1).max(500),
      draftContent: z.record(z.string(), z.unknown()),
      confidence: z.number().min(0).max(1).optional(),
      recommendationId: z.string().uuid().optional(),
      expiresAt: z.string().datetime().optional(),
    });

export type CreateDraftBodyInput = z.infer<typeof createDraftBody>;

export let upsertCatalogBody = z.object({
      recommendationType: z.string().min(1).max(100),
      displayNameEn: z.string().min(1).max(255),
      displayNameAr: z.string().max(255).optional(),
      category: z.enum(['approval', 'assignment', 'escalation', 'remediation', 'compliance', 'risk', 'evidence', 'general']),
      applicableStepTypes: z.array(z.string()).optional(),
      requiresHumanReview: z.boolean().optional(),
      maxConfidenceForAuto: z.number().min(0).max(1).optional(),
    });

export type UpsertCatalogBodyInput = z.infer<typeof upsertCatalogBody>;

export let upsertPolicyBody = z.object({
      aiEnabled: z.boolean().optional(),
      autonomyLevel: z.number().int().min(0).max(5).optional(),
      allowedAiActions: z.array(z.string()).optional(),
      forbiddenActions: z.array(z.string()).optional(),
      maxConfidenceAuto: z.number().min(0).max(1).optional(),
      requireHumanReview: z.boolean().optional(),
      overrideTenantConfig: z.boolean().optional(),
    });

export type UpsertPolicyBodyInput = z.infer<typeof upsertPolicyBody>;

export let activateKillSwitchBody = z.object({
      scope: z.enum(['all_autonomous', 'workflow_specific', 'step_type', 'agent_specific']),
      scopeFilter: z.record(z.string(), z.unknown()).optional(),
      reason: z.string().min(1).max(2000),
      notifyUsers: z.array(z.string()).optional(),
    });

export type ActivateKillSwitchBodyInput = z.infer<typeof activateKillSwitchBody>;

export let initiateRollbackBody = z.object({
      instanceId: z.string().uuid(),
      stepId: z.string().uuid().optional(),
      originalActionId: z.string().uuid().optional(),
      originalActionType: z.string().min(1).max(50),
      originalState: z.record(z.string(), z.unknown()),
      reason: z.string().min(1).max(2000),
    });

export type InitiateRollbackBodyInput = z.infer<typeof initiateRollbackBody>;

export let upsertBudgetBody = z.object({
      periodType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
      maxExecutions: z.number().int().positive(),
      maxCostUnits: z.number().positive(),
    });

export type UpsertBudgetBodyInput = z.infer<typeof upsertBudgetBody>;

export let upsertStepAutonomyBody = z.object({
      workflowId: z.string().uuid().optional(),
      stepType: z.string().min(1).max(50),
      stepSubType: z.string().max(100).optional(),
      allowedAiActions: z.array(z.string()).optional(),
      maxAutonomyLevel: z.number().int().min(0).max(5).optional(),
      mandatoryHumanReview: z.boolean().optional(),
      maxConfidenceRequired: z.number().min(0).max(1).optional(),
    });

export type UpsertStepAutonomyBodyInput = z.infer<typeof upsertStepAutonomyBody>;

export let upsertAgentToolBody = z.object({
      agentId: z.string().min(1).max(20),
      toolName: z.string().min(1).max(100),
      allowed: z.boolean().optional(),
      maxCallsPerExecution: z.number().int().positive().optional(),
      requiresApproval: z.boolean().optional(),
      contextRestrictions: z.record(z.string(), z.unknown()).optional(),
    });

export type UpsertAgentToolBodyInput = z.infer<typeof upsertAgentToolBody>;

export let batchActionBody = z.object({
      action: z.enum(['approve', 'reject', 'escalate', 'acknowledge', 'review_note', 'accept_draft', 'reject_draft']),
      ids: z.array(z.string().uuid()).min(1).max(100),
      reason: z.string().max(2000).optional(),
      decision: z.enum(['accepted', 'rejected', 'modified']).optional(),
    });

export type BatchActionBodyInput = z.infer<typeof batchActionBody>;

export let supervisorActionBody = z.object({
      action: z.enum(['pause', 'resume', 'stop', 'force_escalation', 'override_status']),
      reason: z.string().min(1).max(2000),
      newStatus: z.string().max(50).optional(),
      escalateTo: z.string().max(100).optional(),
    });

export type SupervisorActionBodyInput = z.infer<typeof supervisorActionBody>;

export let addAttachmentBody = z.object({
      instanceId: z.string().uuid(),
      stepId: z.string().uuid().optional(),
      fileId: z.string().uuid().optional(),
      fileName: z.string().min(1).max(500),
      fileSize: z.number().int().positive().optional(),
      mimeType: z.string().max(200).optional(),
      purpose: z.string().max(500).optional(),
    });

export type AddAttachmentBodyInput = z.infer<typeof addAttachmentBody>;

export let createDefinitionsBody = z.object({
      chain_code: z.string().min(1),
      name_en: z.unknown().optional(),
      name_ar: z.unknown().optional(),
      steps: z.unknown().optional(),
      sod_rules: z.unknown().optional(),
    });

export type CreateDefinitionsBodyInput = z.infer<typeof createDefinitionsBody>;

export let createInstancesBody = z.object({
      chainCode: z.string().min(1),
      triggerEntityType: z.unknown().optional(),
      triggerEntityId: z.unknown().optional(),
      context: z.unknown().optional(),
    });

export type CreateInstancesBodyInput = z.infer<typeof createInstancesBody>;

export let createInstancesinstanceIdAdvanceBody = z.object({
      outcome: z.unknown().optional(),
      notes: z.unknown().optional(),
      outcomeData: z.unknown().optional(),
    });

export type CreateInstancesinstanceIdAdvanceBodyInput = z.infer<typeof createInstancesinstanceIdAdvanceBody>;

export let createInstancesinstanceIdCancelBody = z.object({
      reason: z.unknown().optional(),
    });

export type CreateInstancesinstanceIdCancelBodyInput = z.infer<typeof createInstancesinstanceIdCancelBody>;

export let createInstancesinstanceIdFailBody = z.object({
      stepNo: z.unknown().optional(),
      reason: z.unknown().optional(),
    });

export type CreateInstancesinstanceIdFailBodyInput = z.infer<typeof createInstancesinstanceIdFailBody>;

export let createCommentBody = z.object({
      instanceId: z.string().uuid(),
      stepId: z.string().uuid().optional(),
      commentText: z.string().min(1).max(10000),
      visibility: z.enum(['public', 'internal', 'private']).optional(),
      source: z.enum(['human', 'ai_note', 'ai_recommendation', 'system']).optional(),
      aiAgentId: z.string().max(20).optional(),
      aiConfidence: z.number().min(0).max(1).optional(),
      aiDisclaimer: z.string().max(1000).optional(),
      parentCommentId: z.string().uuid().optional(),
    });

export type CreateCommentBodyInput = z.infer<typeof createCommentBody>;

export let updateCommentBody = z.object({
      commentText: z.string().min(1).max(10000).optional(),
      visibility: z.enum(['public', 'internal', 'private']).optional(),
    });

export type UpdateCommentBodyInput = z.infer<typeof updateCommentBody>;

export let gateCheckBody = z.object({
      moduleCode: z.string().max(50),
      stepType: z.string().max(100),
      stepSubType: z.string().max(100).optional(),
      instanceId: z.string().uuid().optional(),
      stepId: z.string().uuid().optional(),
      entityType: z.string().max(100).optional(),
      entityId: z.string().uuid().optional(),
      workflowId: z.string().uuid().optional(),
    });

export type GateCheckBodyInput = z.infer<typeof gateCheckBody>;

export let aiNoteBody = z.object({
      moduleCode: z.string().max(50),
      stepType: z.string().max(100),
      agentId: z.string().max(20),
      noteType: z.enum(['guidance', 'autofill', 'recommendation', 'summary', 'coaching', 'warning']),
      content: z.record(z.string(), z.unknown()),
      confidence: z.number().min(0).max(1).optional(),
      trustLevel: z.enum(['assistive', 'advisory', 'authoritative']).optional(),
      contextSources: z.array(z.string()).optional(),
      instanceId: z.string().uuid().optional(),
      stepId: z.string().uuid().optional(),
    });

export type AiNoteBodyInput = z.infer<typeof aiNoteBody>;

export let createWorkflowtemplatesidInstantiateBody = z.object({
      config: z.record(z.string(), z.unknown()).optional(),
    });

export type CreateWorkflowtemplatesidInstantiateBodyInput = z.infer<typeof createWorkflowtemplatesidInstantiateBody>;

export let createWorkflowsidActivateBody = z.object({
      config: z.record(z.string(), z.unknown()).optional(),
    });

export type CreateWorkflowsidActivateBodyInput = z.infer<typeof createWorkflowsidActivateBody>;

export let exportParams = z.object({ id: z.string().uuid() });

export type ExportParamsInput = z.infer<typeof exportParams>;

export let importBody = z.object({
      definition: z.object({
        nodes: z.array(z.record(z.string(), z.unknown())).max(500).optional(),
        edges: z.array(z.record(z.string(), z.unknown())).max(1000).optional(),
        steps: z.array(z.record(z.string(), z.unknown())).max(500).optional(),
        transitions: z.array(z.record(z.string(), z.unknown())).max(1000).optional(),
        swimlanes: z.array(z.string()).max(50).optional(),
        triggers: z.array(z.record(z.string(), z.unknown())).max(50).optional(),
      }),
      metadata: z.object({
        name: z.string().min(1).max(255),
        version: z.number().int().positive().optional(),
        module_code: z.string().max(100).optional(),
        exported_at: z.string().optional(),
      }),
    });

export type ImportBodyInput = z.infer<typeof importBody>;

export let createInstantiateBody = z.object({
      templateKey: z.string().min(1),
      params: z.unknown().optional(),
    });

export type CreateInstantiateBodyInput = z.infer<typeof createInstantiateBody>;

// ── Auto-generated validation schemas (enterprise hardening) ──

export const createStartBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createGenerateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRecommendBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createApplyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateDismissBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPublishBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSeedBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCancelBody = z.object({
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

export const updateResolveBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCheckBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createValidateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createNotificationStepBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRevertBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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

export const createAiExecuteBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReviewBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateAbsenceBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTransitionBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createForbiddenBoundariesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMandatoryReviewPointsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createDeactivateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAcknowledgeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createExecuteBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAcceptBody = z.object({
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

export const createConvertBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReassignBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCloneBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createNotifyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSlaExtendBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAssignBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEscalateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateAiPolicyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});


export const updatePreferencesBody = (..._args: any[]): any => { return {} as any; };