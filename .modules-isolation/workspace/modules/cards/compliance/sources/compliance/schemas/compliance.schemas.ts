/**
 * Zod validation schemas for Compliance module.
 * Used with validate() middleware in compliance route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from './common.schemas';

export const createFrameworkBody = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  total_controls: z.coerce.number().int().min(0).optional(),
  status: z.enum(['active', 'inactive', 'draft']).default('active'),
  frameworks: z.array(z.string()).optional(),
});

export const updateFrameworkBody = createFrameworkBody.partial();

export const listFrameworksQuery = paginationQuery.merge(statusFilter).extend({
  category: z.string().optional(),
  status: z.string().optional(),
});

export const createControlBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  frameworks: z.array(z.string()).optional(),
  status: z.enum(['not_assessed', 'in_progress', 'assessed', 'compliant', 'non_compliant', 'remediating', 'not_implemented', 'implemented', 'remediation_planned', 'exception']).default('not_assessed'),
  test_status: z.enum(['not_tested', 'passed', 'failed', 'partial']).optional(),
  owner: z.string().optional(),
});

export const updateControlBody = createControlBody.partial();

export const listControlsQuery = paginationQuery.merge(statusFilter).extend({
  framework_id: z.string().uuid().optional(),
  owner: z.string().optional(),
  test_status: z.string().optional(),
  status: z.string().optional(),
});

export const createRemediationBody = z.object({
  control_id: z.string().uuid(),
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  owner: z.string().optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['open', 'in_progress', 'pending_verification', 'verified', 'closed', 'reopened', 'planned', 'completed', 'cancelled', 'overdue']).default('open'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export const updateRemediationBody = createRemediationBody.partial();

export const listRemediationsQuery = paginationQuery.extend({
  control_id: z.string().uuid().optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
});

export const testControlBody = z.object({
  control_id: z.string().uuid(),
  test_result: z.enum(['passed', 'failed', 'partial']),
  test_notes: z.string().optional(),
});

export const bulkUpdateControlsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateControlBody,
});

export const bulkDeleteControlsBody = bulkIdsBody;

// ── Legacy schemas (migrated from flat) ──

export const mapFrameworkBody = z.object({
  framework_id: z.string().uuid(),
  mapping_notes: z.string().optional(),
});

export const listComplianceQuery = paginationQuery.merge(statusFilter);

export const createAttestationBody = z.object({
  framework_id: z.string().uuid(),
  attestation_type: z.string().min(1),
  attestor: z.string().optional(),
  notes: z.string().optional(),
});


// ── Response Schemas ──────────────────────────────────────────
export const complianceResponseSchema = z.object({
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

export const complianceListResponseSchema = z.object({
  data: z.array(complianceResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const complianceEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('compliance'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const complianceStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const complianceImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const complianceImportBatchSchema = z.object({
  rows: z.array(complianceImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const complianceExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const complianceAdminConfigSchema = z.object({
  moduleCode: z.literal('compliance'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const complianceBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const complianceBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let storeTestDefinitionBody = z.object({
      testId: z.string().min(1),
      controlId: z.string().min(1),
      steps: z.array(z.object({})),
    });

export type StoreTestDefinitionBodyInput = z.infer<typeof storeTestDefinitionBody>;

export let createCampaignBody = z.object({});

export type CreateCampaignBodyInput = z.infer<typeof createCampaignBody>;

export let submitAttestationBody = z.object({
      action: z.string().min(1),
      declinedReason: z.string().optional(),
    });

export type SubmitAttestationBodyInput = z.infer<typeof submitAttestationBody>;

export let reviewAttestationBody = z.object({
      decision: z.string().min(1),
    });

export type ReviewAttestationBodyInput = z.infer<typeof reviewAttestationBody>;

export let registerDriftRuleBody = z.object({});

export type RegisterDriftRuleBodyInput = z.infer<typeof registerDriftRuleBody>;

export let runDriftScanBody = z.object({
      category: z.string().optional(),
    });

export type RunDriftScanBodyInput = z.infer<typeof runDriftScanBody>;

export let mapControlBody = z.object({
      nodeIds: z.array(z.string()),
    });

export type MapControlBodyInput = z.infer<typeof mapControlBody>;

export let createObligationBody = z.object({});

export type CreateObligationBodyInput = z.infer<typeof createObligationBody>;

export let updateObligationBody = z.object({});

export type UpdateObligationBodyInput = z.infer<typeof updateObligationBody>;

export let mapControlToObligationBody = z.object({
      mappingType: z.enum(['direct', 'partial', 'compensating']).optional(),
      coveragePercent: z.number().optional(),
    });

export type MapControlToObligationBodyInput = z.infer<typeof mapControlToObligationBody>;

export let assignReviewerBody = z.object({ reviewerId: z.string().min(1) });

export type AssignReviewerBodyInput = z.infer<typeof assignReviewerBody>;

export let approveAssessmentBody = z.object({ notes: z.string().optional() });

export type ApproveAssessmentBodyInput = z.infer<typeof approveAssessmentBody>;

export let rejectAssessmentBody = z.object({ notes: z.string().min(1) });

export type RejectAssessmentBodyInput = z.infer<typeof rejectAssessmentBody>;

export let auditPackageBody = z.object({});

export type AuditPackageBodyInput = z.infer<typeof auditPackageBody>;

export let traceabilityMatrixBody = z.object({});

export type TraceabilityMatrixBodyInput = z.infer<typeof traceabilityMatrixBody>;

export let createFindingBody = z.object({ title: z.string().min(1) });

export type CreateFindingBodyInput = z.infer<typeof createFindingBody>;

export let updateFindingBody = z.object({});

export type UpdateFindingBodyInput = z.infer<typeof updateFindingBody>;

export let bulkUpdateFindingStatusBody = z.object({
      findingIds: z.array(z.string()).min(1),
      status: z.string().min(1),
    });

export type BulkUpdateFindingStatusBodyInput = z.infer<typeof bulkUpdateFindingStatusBody>;

export let bulkAssignControlsBody = z.object({
      controlIds: z.array(z.string()).min(1),
      ownerId: z.string().min(1),
    });

export type BulkAssignControlsBodyInput = z.infer<typeof bulkAssignControlsBody>;

export let assessFrameworkBody = z.object({});

export type AssessFrameworkBodyInput = z.infer<typeof assessFrameworkBody>;

export let mapEvidenceToObligationBody = z.object({ evidenceId: z.string().min(1) });

export type MapEvidenceToObligationBodyInput = z.infer<typeof mapEvidenceToObligationBody>;

export let importObligationsBody = z.object({ obligations: z.array(z.object({})).min(1) });

export type ImportObligationsBodyInput = z.infer<typeof importObligationsBody>;

export let updateObligationPatchBody = z.object({});

export type UpdateObligationPatchBodyInput = z.infer<typeof updateObligationPatchBody>;

export let updateGapBody = z.object({});

export type UpdateGapBodyInput = z.infer<typeof updateGapBody>;

export let createGapRemediationBody = z.object({ title: z.string().min(1) });

export type CreateGapRemediationBodyInput = z.infer<typeof createGapRemediationBody>;

export let validateGapBody = z.object({});

export type ValidateGapBodyInput = z.infer<typeof validateGapBody>;

export let updateMilestoneBody = z.object({});

export type UpdateMilestoneBodyInput = z.infer<typeof updateMilestoneBody>;

export let updateRoadmapTaskBody = z.object({});

export type UpdateRoadmapTaskBodyInput = z.infer<typeof updateRoadmapTaskBody>;

export let driftBaselineBody = z.object({
      entityType: z.enum(['control', 'finding', 'both']).optional(),
    });

export type DriftBaselineBodyInput = z.infer<typeof driftBaselineBody>;

export let driftDetectBody = z.object({
      entityType: z.enum(['control', 'finding', 'both']).optional(),
    });

export type DriftDetectBodyInput = z.infer<typeof driftDetectBody>;

export let createRegulatoryChangeBody = z.object({ title: z.string().min(1) });

export type CreateRegulatoryChangeBodyInput = z.infer<typeof createRegulatoryChangeBody>;

export let assessRegulatoryImpactBody = z.object({});

export type AssessRegulatoryImpactBodyInput = z.infer<typeof assessRegulatoryImpactBody>;

export let updateRegChangeStatusBody = z.object({ status: z.string().min(1) });

export type UpdateRegChangeStatusBodyInput = z.infer<typeof updateRegChangeStatusBody>;

export let addMappingBody = z.object({});

export type AddMappingBodyInput = z.infer<typeof addMappingBody>;

export let pollCloudBody = z.object({});

export type PollCloudBodyInput = z.infer<typeof pollCloudBody>;

export let reassignTaskBody = z.object({
      userId: z.string().min(1),
    });

export type ReassignTaskBodyInput = z.infer<typeof reassignTaskBody>;

export let createControlTestBody = z.object({
      control_id: z.string().min(1),
      test_result: z.string().min(1),
      tester: z.string().optional(),
      notes: z.string().optional(),
      evidence_ref: z.string().optional(),
    });

export type CreateControlTestBodyInput = z.infer<typeof createControlTestBody>;

export let resolveFailureBody = z.object({
      resolution_note: z.string().optional(),
    });

export type ResolveFailureBodyInput = z.infer<typeof resolveFailureBody>;

export let bulkAssignTeamBody = z.object({
      control_ids: z.array(z.string()).min(1),
      owner_team_id: z.string().optional(),
    });

export type BulkAssignTeamBodyInput = z.infer<typeof bulkAssignTeamBody>;

export let createQuestionnaireBody = z.object({});

export type CreateQuestionnaireBodyInput = z.infer<typeof createQuestionnaireBody>;

export let submitResponseBody = z.object({
      questionnaireId: z.string().min(1),
      controlId: z.string().min(1),
      respondentId: z.string().min(1),
      period: z.string().min(1),
    });

export type SubmitResponseBodyInput = z.infer<typeof submitResponseBody>;

export let createMappingBody = z.object({
      source_framework_id: z.string().min(1),
      target_framework_id: z.string().min(1),
      coverage: z.number().optional(),
    });

export type CreateMappingBodyInput = z.infer<typeof createMappingBody>;

export let emptyBody = z.object({});

export type EmptyBodyInput = z.infer<typeof emptyBody>;

export let createAssessmentBody = z.object({
      title: z.string().optional(),
    });

export type CreateAssessmentBodyInput = z.infer<typeof createAssessmentBody>;

export let updateItemsBody = z.object({
      updates: z.array(z.object({})).min(1),
    });

export type UpdateItemsBodyInput = z.infer<typeof updateItemsBody>;

export let campaignsPostBody = z.object({});

export type CampaignsPostBodyInput = z.infer<typeof campaignsPostBody>;

export let campaignsCampaignIdLaunchPostBody = z.object({});

export type CampaignsCampaignIdLaunchPostBodyInput = z.infer<typeof campaignsCampaignIdLaunchPostBody>;

export let responsesResponseIdPostBody = z.object({});

export type ResponsesResponseIdPostBodyInput = z.infer<typeof responsesResponseIdPostBody>;

export let importFeedBody = z.object({
      feed: z.array(z.object({})),
    });

export type ImportFeedBodyInput = z.infer<typeof importFeedBody>;

export let logFrameworkChangeBody = z.object({});

export type LogFrameworkChangeBodyInput = z.infer<typeof logFrameworkChangeBody>;

export let resolveImpactBody = z.object({});

export type ResolveImpactBodyInput = z.infer<typeof resolveImpactBody>;

export let createSAMAAssessmentBody = z.object({
      title: z.string().optional(),
    });

export type CreateSAMAAssessmentBodyInput = z.infer<typeof createSAMAAssessmentBody>;

export let updateSAMAItemsBody = z.object({
      updates: z.array(z.object({})).min(1),
    });

export type UpdateSAMAItemsBodyInput = z.infer<typeof updateSAMAItemsBody>;

export let generatePolicyDraftBody = z.object({
      control_code: z.string().min(1, 'control_code is required'),
      framework_code: z.string().min(1, 'framework_code is required'),
      policy_type: z.string().min(1, 'policy_type is required'),
    });

export type GeneratePolicyDraftBodyInput = z.infer<typeof generatePolicyDraftBody>;

export let createScoringPolicyBody = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      weights: z.record(z.string(), z.unknown()).optional(),
    });

export type CreateScoringPolicyBodyInput = z.infer<typeof createScoringPolicyBody>;

export let updateScoringPolicyBody = z.object({});

export type UpdateScoringPolicyBodyInput = z.infer<typeof updateScoringPolicyBody>;

export let createPolicyBody = z.object({
      name: z.string().min(1),
      weights: z.record(z.string(), z.unknown()),
      is_default: z.boolean().optional(),
    });

export type CreatePolicyBodyInput = z.infer<typeof createPolicyBody>;

export let updatePolicyBody = z.object({});

export type UpdatePolicyBodyInput = z.infer<typeof updatePolicyBody>;

export let createUCFControlBody = z.object({
      code: z.string().min(1),
    });

export type CreateUCFControlBodyInput = z.infer<typeof createUCFControlBody>;

export let addUCFMappingBody = z.object({
      sourceControlId: z.string().min(1),
      targetRequirementId: z.string().min(1),
    });

export type AddUCFMappingBodyInput = z.infer<typeof addUCFMappingBody>;

export let activateControlBody = z.object({
      controlId: z.string().min(1),
    });

export type ActivateControlBodyInput = z.infer<typeof activateControlBody>;

export let organizationsIdInquiriesPostBody = z.object({
      requestType: z.string(),
      subject: z.string(),
      body: z.string(),
    });

export type OrganizationsIdInquiriesPostBodyInput = z.infer<typeof organizationsIdInquiriesPostBody>;

export let organizationsIdResponsePostBody = z.object({
      requestId: z.string(),
      context: z.record(z.string(), z.unknown()).optional(),
    });

export type OrganizationsIdResponsePostBodyInput = z.infer<typeof organizationsIdResponsePostBody>;

export let createRegulatorBody = z.object({
      category_name: z.string().min(1),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

export type CreateRegulatorBodyInput = z.infer<typeof createRegulatorBody>;

export let updateRegulatorBody = z.object({});

export type UpdateRegulatorBodyInput = z.infer<typeof updateRegulatorBody>;

export const linkPolicyToObligationBody = z.object({ linkType: z.enum(['implements', 'supports', 'references']).optional(), relevanceScore: z.number().min(0).max(100).optional(), notes: z.string().optional() });
export type LinkPolicyToObligationInput = z.infer<typeof linkPolicyToObligationBody>;

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

export const createActivateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRemindersBody = z.object({
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

export const createResolveBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTriageBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTasksBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createFromAssessmentBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRunBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateSettingsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createApplicabilityRulesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createApplicabilityBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createDetectBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAutoMapBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAutoMapAllBody = z.object({
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

export const createSubmitReviewBody = z.object({
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

export const createAiRecommendationsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const bulkBulkAiAssessBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.string().min(1).max(50).optional(),
});

export const createCheckBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRegulatoryChangesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateStatusBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createImpactBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createObligationsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateObligationsBody = createObligationsBody.partial();

export const createTestPlansBody = z.object({
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

export const createFilingsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRefreshBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createStoreBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createComplianceBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateResponseBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCheckDeadlinesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createNcaBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSamaBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPdplBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAssessBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createLaunchBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCompleteBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});


export const createGenerateAiSuggestionsBody = z.object({
  controlId: z.string().uuid().optional(),
  context: z.string().max(5000).optional(),
  categories: z.array(z.string()).max(20).optional(),
  maxSuggestions: z.number().int().min(1).max(50).optional().default(5),
  language: z.enum(['en', 'ar']).optional().default('en'),
});
export const genericComplianceSchema = z.any();
export const frameworkMutationSchema = z.any();
export const assessmentMutationSchema = z.any();
export const controlMutationSchema = z.any();
export const findingMutationSchema = z.any();
export const AcceptMappingsSchema = z.any();
export const AddSectorSchema = z.any();
export const CreateAlertSchema = z.any();
export const LogFrameworkChangeSchema = z.any();
export const NLQuerySchema = z.any();
export const NotesBody = z.any();
export const RegisterVersionSchema = z.any();
export const RemediationPlanSchema = z.any();
