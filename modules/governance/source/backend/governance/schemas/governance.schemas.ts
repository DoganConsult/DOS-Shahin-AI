/**
 * Zod validation schemas for Governance module.
 * Used with validate() middleware in governance route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createPolicyBody = z.object({
  title: z.string().min(3).max(255),
  code: z.string().max(50).optional(),
  description: z.string().optional(),
  category: z.string().max(100).optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'active', 'archived']).default('draft'),
  owner: z.string().optional(),
  effective_date: z.string().datetime({ offset: true }).optional(),
  review_date: z.string().datetime({ offset: true }).optional(),
});

export const updatePolicyBody = createPolicyBody.partial();

export const listPoliciesQuery = paginationQuery.merge(statusFilter).extend({
  category: z.string().optional(),
  owner: z.string().optional(),
});

export const createCommitteeBody = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  chair: z.string().optional(),
  cadence: z.string().max(50).optional(),
});

export const updateCommitteeBody = createCommitteeBody.partial();

export const bulkDeletePoliciesBody = bulkIdsBody;

// ── Bulk Operations ─────────────────────────────────────────────

export const bulkUpdatePoliciesBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updatePolicyBody,
});

// ── Legacy schemas (migrated from flat) ──

export const createActionItemBody = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().datetime({ offset: true }).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  source_type: z.string().optional(),
  source_id: z.string().uuid().optional(),
});

export const updateActionItemBody = createActionItemBody.partial();

export const createGRCPlanBody = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  plan_type: z.string().optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  owner: z.string().optional(),
});

export const updateGRCPlanBody = createGRCPlanBody.partial();

export const createDecisionBody = z.object({
  decision_text: z.string().min(1),
  authority_source: z.string().min(1),
  rationale: z.string().min(1),
  effective_date: z.string().datetime({ offset: true }).optional(),
});

export const updateDecisionBody = createDecisionBody.partial();

export const createDelegationBody = z.object({
  authority_type: z.string().min(1),
  delegator_user_id: z.string().uuid(),
  delegate_user_id: z.string().uuid(),
  expiry_date: z.string().datetime({ offset: true }),
  scope: z.string().optional(),
  conditions: z.string().optional(),
});

export const updateDelegationBody = createDelegationBody.partial();

export const createCharterBody = z.object({
  title_en: z.string().min(1).max(255),
  sponsor: z.string().min(1),
  review_date: z.string().datetime({ offset: true }),
  scope: z.string().optional(),
  objectives: z.string().optional(),
});

export const updateCharterBody = createCharterBody.partial();

export const createMeetingBody = z.object({
  committee_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  date: z.string().datetime({ offset: true }),
  attendees: z.array(z.string()).optional(),
  agenda: z.string().optional(),
});

export const updateMeetingBody = createMeetingBody.partial();

export const listGovernanceQuery = paginationQuery.merge(statusFilter);

// ── Committee Members ───────────────────────────────────────────

export const addCommitteeMemberBody = z.object({
  user_id: z.string().uuid(),
  role: z.string().max(100).optional(),
});

// ── Agenda Items ────────────────────────────────────────────────

export const createAgendaItemBody = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  presenter: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
});

// ── Meeting Attendance ──────────────────────────────────────────

export const addMeetingAttendeeBody = z.object({
  user_id: z.string().uuid(),
  role: z.string().max(100).optional(),
});

export const updateAttendanceStatusBody = z.object({
  status: z.enum(['present', 'absent', 'excused', 'remote']),
});

// ── Voting ──────────────────────────────────────────────────────

export const createVoteBody = z.object({
  agenda_item_id: z.string().uuid().optional(),
  motion: z.string().min(1),
  vote_type: z.enum(['simple_majority', 'two_thirds', 'unanimous']).default('simple_majority'),
});

// ── Action Updates ──────────────────────────────────────────────

export const addActionUpdateBody = z.object({
  update_text: z.string().min(1),
  progress_pct: z.number().min(0).max(100).optional(),
});

export const closeActionItemBody = z.object({
  resolution: z.string().min(1),
  closure_notes: z.string().optional(),
});

// ── Policy Review ───────────────────────────────────────────────

export const rejectPolicyBody = z.object({
  reason: z.string().min(1),
  reviewer_notes: z.string().optional(),
});

// ── SoD Conflict Management ─────────────────────────────────────

export const resolveSoDConflictBody = z.object({
  resolution: z.enum(['accept_risk', 'mitigate', 'reassign']),
  justification: z.string().min(1),
  mitigating_control_id: z.string().uuid().optional(),
});

export const bulkResolveSoDConflictBody = z.object({
  conflict_ids: z.array(z.string().uuid()).min(1).max(100),
  resolution: z.enum(['accept_risk', 'mitigate', 'reassign']),
  justification: z.string().min(1),
});

export const reopenSoDConflictBody = z.object({
  reason: z.string().min(1),
});

export const checkSoDBeforeAssignmentBody = z.object({
  user_id: z.string().uuid(),
  role_id: z.string().uuid(),
  scope: z.string().optional(),
});


// ── Response Schemas ──────────────────────────────────────────
export const governanceResponseSchema = z.object({
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

export const governanceListResponseSchema = z.object({
  data: z.array(governanceResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const governanceEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('governance'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const governanceStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const governanceImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const governanceImportBatchSchema = z.object({
  rows: z.array(governanceImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const governanceExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const governanceAdminConfigSchema = z.object({
  moduleCode: z.literal('governance'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const governanceBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const governanceBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createCampaignBody = z.object({
      policy_id: z.string().min(1),
      title: z.string().min(1),
      due_date: z.string().optional(),
    });

export type CreateCampaignBodyInput = z.infer<typeof createCampaignBody>;

export let recordAcknowledgementBody = z.object({
      policy_id: z.string().min(1),
      version_acknowledged: z.number().optional(),
      campaign_id: z.string().optional(),
      due_date: z.string().optional(),
    });

export type RecordAcknowledgementBodyInput = z.infer<typeof recordAcknowledgementBody>;

export let rejectRecommendationBody = z.object({
      reason: z.string().optional(),
    });

export type RejectRecommendationBodyInput = z.infer<typeof rejectRecommendationBody>;

export let submitFeedbackBody = z.object({
      source_type: z.string().min(1),
      source_id: z.string().min(1),
      feedback_type: z.string().optional(),
      feedback_text: z.string().optional(),
    });

export type SubmitFeedbackBodyInput = z.infer<typeof submitFeedbackBody>;

export let createBoardPackBody = z.object({});

export type CreateBoardPackBodyInput = z.infer<typeof createBoardPackBody>;

export let updateBoardPackBody = z.object({});

export type UpdateBoardPackBodyInput = z.infer<typeof updateBoardPackBody>;

export let addBoardPackItemBody = z.object({});

export type AddBoardPackItemBodyInput = z.infer<typeof addBoardPackItemBody>;

export let generateReportBody = z.object({
      period_start: z.string(),
      period_end: z.string(),
      pack_type: z.string().optional(),
    });

export type GenerateReportBodyInput = z.infer<typeof generateReportBody>;

export let upsertAuthorityLevelBody = z.object({});

export type UpsertAuthorityLevelBodyInput = z.infer<typeof upsertAuthorityLevelBody>;

export let requestDelegationBody = z.object({});

export type RequestDelegationBodyInput = z.infer<typeof requestDelegationBody>;

export let rejectDelegationBody = z.object({
      reason: z.string().min(1),
    });

export type RejectDelegationBodyInput = z.infer<typeof rejectDelegationBody>;

export let resolveViolationBody = z.object({
      resolution_notes: z.string().optional(),
    });

export type ResolveViolationBodyInput = z.infer<typeof resolveViolationBody>;

export let createSummaryBody = z.object({});

export type CreateSummaryBodyInput = z.infer<typeof createSummaryBody>;

export let updateSummaryBody = z.object({});

export type UpdateSummaryBodyInput = z.infer<typeof updateSummaryBody>;

export let generateSummaryBody = z.object({});

export type GenerateSummaryBodyInput = z.infer<typeof generateSummaryBody>;

export let updateThresholdsBody = z.object({
      green_min: z.number().optional(),
      yellow_min: z.number().optional(),
      dimension_weights: z.record(z.string(), z.unknown()).optional(),
    });

export type UpdateThresholdsBodyInput = z.infer<typeof updateThresholdsBody>;

export let fromRiskBody = z.object({
      risk_id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.string().optional(),
    });

export type FromRiskBodyInput = z.infer<typeof fromRiskBody>;

export let fromAuditFindingBody = z.object({
      finding_id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.string().optional(),
      board_attention: z.boolean().optional(),
    });

export type FromAuditFindingBodyInput = z.infer<typeof fromAuditFindingBody>;

export let fromComplianceGapBody = z.object({
      gap_id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.string().optional(),
    });

export type FromComplianceGapBodyInput = z.infer<typeof fromComplianceGapBody>;

export let fromIncidentBody = z.object({
      incident_id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.string().optional(),
      board_attention: z.boolean().optional(),
    });

export type FromIncidentBodyInput = z.infer<typeof fromIncidentBody>;

export let fromControlFailureBody = z.object({
      control_id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.string().optional(),
    });

export type FromControlFailureBodyInput = z.infer<typeof fromControlFailureBody>;

export let createMandateBody = z.object({});

export type CreateMandateBodyInput = z.infer<typeof createMandateBody>;

export let updateMandateBody = z.object({});

export type UpdateMandateBodyInput = z.infer<typeof updateMandateBody>;

export let addMandateSourceBody = z.object({});

export type AddMandateSourceBodyInput = z.infer<typeof addMandateSourceBody>;

export let createObjectiveBody = z.object({});

export type CreateObjectiveBodyInput = z.infer<typeof createObjectiveBody>;

export let updateObjectiveBody = z.object({});

export type UpdateObjectiveBodyInput = z.infer<typeof updateObjectiveBody>;

export let createObligationBody = z.object({});

export type CreateObligationBodyInput = z.infer<typeof createObligationBody>;

export let updateObligationBody = z.object({});

export type UpdateObligationBodyInput = z.infer<typeof updateObligationBody>;

export let linkEvidenceBody = z.object({
      evidence_id: z.string().min(1),
    });

export type LinkEvidenceBodyInput = z.infer<typeof linkEvidenceBody>;

export let linkControlBody = z.object({
      control_id: z.string().min(1),
    });

export type LinkControlBodyInput = z.infer<typeof linkControlBody>;

export let requestExemptionBody = z.object({
      reason: z.string().optional(),
    });

export type RequestExemptionBodyInput = z.infer<typeof requestExemptionBody>;

export let riskAppetiteBody = z.object({});

export type RiskAppetiteBodyInput = z.infer<typeof riskAppetiteBody>;

export let authorityMatrixBody = z.object({});

export type AuthorityMatrixBodyInput = z.infer<typeof authorityMatrixBody>;

export let checkAuthorityBody = z.object({
      riskId: z.string().min(1),
      userId: z.string().min(1),
    });

export type CheckAuthorityBodyInput = z.infer<typeof checkAuthorityBody>;

export let createRaciTemplateBody = z.object({
      name_en: z.string().min(1),
    });

export type CreateRaciTemplateBodyInput = z.infer<typeof createRaciTemplateBody>;

export let updateRaciTemplateBody = z.object({});

export type UpdateRaciTemplateBodyInput = z.infer<typeof updateRaciTemplateBody>;

export let setRaciAssignmentsBody = z.object({
      assignments: z.array(z.unknown()).min(1),
    });

export type SetRaciAssignmentsBodyInput = z.infer<typeof setRaciAssignmentsBody>;

export let createTemplateBody = z.object({});

export type CreateTemplateBodyInput = z.infer<typeof createTemplateBody>;

export let updateTemplateBody = z.object({});

export type UpdateTemplateBodyInput = z.infer<typeof updateTemplateBody>;

export let setAssignmentsBody = z.object({
      assignments: z.array(z.unknown()),
    });

export type SetAssignmentsBodyInput = z.infer<typeof setAssignmentsBody>;

export let createRegisterBody = z.object({
      register_type: z.string().min(1),
      name_en: z.string().min(1),
    });

export type CreateRegisterBodyInput = z.infer<typeof createRegisterBody>;

export let updateRegisterBody = z.object({});

export type UpdateRegisterBodyInput = z.infer<typeof updateRegisterBody>;

export let createResponsibilityBody = z.object({});

export type CreateResponsibilityBodyInput = z.infer<typeof createResponsibilityBody>;

export let updateResponsibilityBody = z.object({});

export type UpdateResponsibilityBodyInput = z.infer<typeof updateResponsibilityBody>;

export let createAssignmentBody = z.object({});

export type CreateAssignmentBodyInput = z.infer<typeof createAssignmentBody>;

export let createReviewBody = z.object({});

export type CreateReviewBodyInput = z.infer<typeof createReviewBody>;

export let updateReviewBody = z.object({});

export type UpdateReviewBodyInput = z.infer<typeof updateReviewBody>;

export let completeReviewBody = z.object({
      outcome: z.string().min(1),
      comments: z.string().optional(),
      next_review_date: z.string().optional(),
    });

export type CompleteReviewBodyInput = z.infer<typeof completeReviewBody>;

export let nameSchema = z.object({
      name_en: z.string().min(1).max(500),
      name_ar: z.string().max(500).optional().nullable(),
    });

export type NameSchemaInput = z.infer<typeof nameSchema>;

export let legalEntityUpdateSchema = z.object({
      name_en: z.string().min(1).max(500).optional(),
      name_ar: z.string().max(500).optional().nullable(),
      entity_type: z.string().max(100).optional().nullable(),
      registration_no: z.string().max(200).optional().nullable(),
      country: z.string().max(100).optional().nullable(),
      description: z.string().max(5000).optional().nullable(),
    });

export type LegalEntityUpdateSchemaInput = z.infer<typeof legalEntityUpdateSchema>;

export let createDomainBody = z.object({
      name_en: z.string().min(1),
      name_ar: z.string().optional(),
      description: z.string().optional(),
      owner_id: z.string().optional(),
      sort_order: z.number().optional(),
    });

export type CreateDomainBodyInput = z.infer<typeof createDomainBody>;

export let updateDomainBody = z.object({});

export type UpdateDomainBodyInput = z.infer<typeof updateDomainBody>;

export let createBodyBody = z.object({
      name_en: z.string().min(1),
      domain_id: z.string().optional(),
      body_type: z.string().optional(),
      name_ar: z.string().optional(),
      description: z.string().optional(),
      chair_user_id: z.string().optional(),
    });

export type CreateBodyBodyInput = z.infer<typeof createBodyBody>;

export let updateBodyBody = z.object({});

export type UpdateBodyBodyInput = z.infer<typeof updateBodyBody>;

export let createReportingLineBody = z.object({
      parent_body_id: z.string().min(1),
      child_body_id: z.string().min(1),
      relationship_type: z.string().optional(),
    });

export type CreateReportingLineBodyInput = z.infer<typeof createReportingLineBody>;

export let createCodeOfConductBody = z.object({
      title_en: z.string().min(1),
      title_ar: z.string().optional(),
      owner: z.string().optional(),
      effective_date: z.string().optional(),
    });

export type CreateCodeOfConductBodyInput = z.infer<typeof createCodeOfConductBody>;

export let createDisclosureBody = z.object({
      discloser_name: z.string().min(1),
      disclosure_type: z.string().optional(),
      description: z.string().optional(),
    });

export type CreateDisclosureBodyInput = z.infer<typeof createDisclosureBody>;

export let createEthicsReportBody = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      severity: z.string().optional(),
      report_type: z.string().optional(),
      category: z.string().optional(),
      anonymous: z.boolean().optional(),
    });

export type CreateEthicsReportBodyInput = z.infer<typeof createEthicsReportBody>;

export let updateEthicsReportBody = z.object({
      status: z.string().optional(),
      assigned_investigator: z.string().optional(),
      resolution: z.string().optional(),
      severity: z.string().optional(),
    });

export type UpdateEthicsReportBodyInput = z.infer<typeof updateEthicsReportBody>;

export let createEthicsActionBody = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      action_type: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
    });

export type CreateEthicsActionBodyInput = z.infer<typeof createEthicsActionBody>;

export let updateEthicsActionBody = z.object({
      status: z.string().optional(),
      outcome: z.string().optional(),
    });

export type UpdateEthicsActionBodyInput = z.infer<typeof updateEthicsActionBody>;

export let raciGateBody = z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      targetState: z.string().min(1),
    });

export type RaciGateBodyInput = z.infer<typeof raciGateBody>;

export let assignRaciBody = z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      raciRole: z.string().min(1),
      teamId: z.string().optional(),
      deptId: z.string().optional(),
      userId: z.string().optional(),
      notes: z.string().optional(),
    });

export type AssignRaciBodyInput = z.infer<typeof assignRaciBody>;

export let assignOwnerBody = z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      userId: z.string().min(1),
      ownershipType: z.string().optional(),
      isPrimary: z.boolean().optional(),
    });

export type AssignOwnerBodyInput = z.infer<typeof assignOwnerBody>;

export let assignTeamBody = z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      teamId: z.string().min(1),
      isSecondary: z.boolean().optional(),
      deptId: z.string().optional(),
    });

export type AssignTeamBodyInput = z.infer<typeof assignTeamBody>;

export let createEvidenceActionBody = z.object({
      actionType: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
      assignedTo: z.string().optional(),
      assignedTeam: z.string().optional(),
      dueDate: z.string().optional(),
      priority: z.string().optional(),
    });

export type CreateEvidenceActionBodyInput = z.infer<typeof createEvidenceActionBody>;

export let updateEvidenceActionBody = z.object({
      status: z.string().optional(),
      outcomeNotes: z.string().optional(),
    });

export type UpdateEvidenceActionBodyInput = z.infer<typeof updateEvidenceActionBody>;

export let startPostBody = z.object({});

export type StartPostBodyInput = z.infer<typeof startPostBody>;

export let idRespondPutBody = z.object({
      responses: z.array(z.unknown()),
    });

export type IdRespondPutBodyInput = z.infer<typeof idRespondPutBody>;

export let idAutoDeployPostBody = z.object({});

export type IdAutoDeployPostBodyInput = z.infer<typeof idAutoDeployPostBody>;

export let adaptiveQuestionsPostBody = z.object({
      responses: z.array(z.unknown()).optional(),
    });

export type AdaptiveQuestionsPostBodyInput = z.infer<typeof adaptiveQuestionsPostBody>;

export let idFrameworkRecommendationsPostBody = z.object({});

export type IdFrameworkRecommendationsPostBodyInput = z.infer<typeof idFrameworkRecommendationsPostBody>;

export let trackerCheckThresholdPostBody = z.object({
      score: z.number().optional(),
      threshold: z.number().optional(),
    });

export type TrackerCheckThresholdPostBodyInput = z.infer<typeof trackerCheckThresholdPostBody>;

export let autoAssessPostBody = z.object({
      frameworkCode: z.string().optional(),
    });

export type AutoAssessPostBodyInput = z.infer<typeof autoAssessPostBody>;

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

export const createScanBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRecalculateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAssembleBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAutoAssembleBody = z.object({
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

export const createPublishBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const exportExportBody = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('csv'),
  filters: z.record(z.string(), z.unknown()).optional(),
});

export const createActivateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createLegalEntitiesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateLegalEntitiesBody = createLegalEntitiesBody.partial();

export const updateChairBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateEscalateBody = z.object({
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

export const createAuditPackageBody = z.object({
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

export const createRiskComputeAllBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAutoFireBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createSeedBaselineBody = z.object({
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

export const createRevokeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createExpireOverdueBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createArchiveBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createComputeBody = z.object({
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

export const createProofsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateProofsBody = createProofsBody.partial();

export const createVerifyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createParseBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});


export const createSeedDefaultsBody = z.object({
  force: z.boolean().optional(),
  modules: z.array(z.string().max(100)).optional(),
});

export const createGovernanceBody = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(['draft', 'active', 'suspended', 'archived']).default('draft'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateGovernanceBody = createGovernanceBody.partial();

export const createRegulatoryImpactBody = z.object({
  regulationId: z.string().min(1).max(255),
  impactArea: z.string().min(1).max(255),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  description: z.string().max(5000).optional(),
  affectedModules: z.array(z.string().max(100)).optional(),
});

export const createEvaluateLiveBody = z.object({
  entityType: z.string().min(1).max(100).optional(),
  entityId: z.string().uuid().optional(),
  evaluationContext: z.record(z.string(), z.unknown()).optional(),
});

// ── Generic Schema (DELETE routes, empty-body requests) ─────────────

export const genericGovernanceSchema = z.object({
  reason: z.string().max(2000).optional(),
  force: z.boolean().optional(),
}).passthrough();

// ── Mandate Schemas ───��─────────────────────────────────────────────

export const createGovernanceMandateSchema = z.object({
  title: z.string().min(1).max(500),
  title_ar: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  mandate_type: z.enum(['regulation', 'standard', 'policy', 'directive', 'guideline']).optional(),
  status: z.enum(['draft', 'active', 'suspended', 'archived']).default('draft'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  jurisdiction: z.string().max(255).optional(),
  effective_date: z.string().datetime({ offset: true }).optional(),
  expiry_date: z.string().datetime({ offset: true }).optional(),
  owner_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateGovernanceMandateSchema = createGovernanceMandateSchema.partial();

// ── Objective Schemas ───────────────────────────────────────────────

export const createGovernanceObjectiveSchema = z.object({
  title: z.string().min(1).max(500),
  title_ar: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  category: z.enum(['strategic', 'operational', 'compliance', 'financial', 'reputational']).optional(),
  status: z.enum(['draft', 'active', 'achieved', 'cancelled']).default('draft'),
  parent_id: z.string().uuid().optional(),
  owner_id: z.string().uuid().optional(),
  target_date: z.string().datetime({ offset: true }).optional(),
  kpis: z.array(z.object({
    metric: z.string().max(255),
    target: z.coerce.number(),
    unit: z.string().max(50).optional(),
  })).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateGovernanceObjectiveSchema = createGovernanceObjectiveSchema.partial();

// ── Review Schemas ──────────────────────────────────────────────────

export const createGovernanceReviewSchema = z.object({
  title: z.string().min(1).max(500),
  review_type: z.enum(['periodic', 'event_driven', 'compliance', 'audit', 'ad_hoc']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  policy_id: z.string().uuid().optional(),
  reviewer_id: z.string().uuid().optional(),
  due_date: z.string().datetime({ offset: true }).optional(),
  scope: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateGovernanceReviewSchema = createGovernanceReviewSchema.partial();

// ── Register Schema ─────────────────────────────────────────────────

export const updateGovernanceRegisterSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['draft', 'active', 'suspended', 'archived']).optional(),
  owner_id: z.string().uuid().optional(),
  review_frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Responsibility Schema ───────────────────────────────────────────

export const createGovernanceResponsibilitySchema = z.object({
  entity_type: z.string().min(1).max(100),
  entity_id: z.string().uuid(),
  role_type: z.enum(['responsible', 'accountable', 'consulted', 'informed']),
  user_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

// ── Structure Generation Schema ─────────────────────────────────────

export const generateGovernanceStructureSchema = z.object({
  templateCode: z.string().max(100).optional(),
  includeCommittees: z.boolean().optional(),
  includePolicies: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Board Decision Schema ───────────────────────────────────────────

export const createBoardDecisionSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  decision_type: z.enum(['approval', 'directive', 'resolution', 'policy_change', 'delegation']).optional(),
  meeting_id: z.string().uuid().optional(),
  status: z.enum(['proposed', 'approved', 'rejected', 'deferred', 'implemented']).default('proposed'),
  voted_for: z.coerce.number().int().min(0).optional(),
  voted_against: z.coerce.number().int().min(0).optional(),
  abstained: z.coerce.number().int().min(0).optional(),
  effective_date: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Ethics Governance Schema ────────────────────────────────────────

export const updateEthicsGovernanceSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  ethics_category: z.enum(['conflict_of_interest', 'whistleblowing', 'code_of_conduct', 'anti_bribery', 'data_ethics']).optional(),
  status: z.enum(['draft', 'active', 'under_review', 'archived']).optional(),
  owner_id: z.string().uuid().optional(),
  review_date: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── GRC RACI Schema ─────────────────────────────────────────────────

export const calculateGrcRaciSchema = z.object({
  entity_type: z.string().min(1).max(100).optional(),
  entity_id: z.string().uuid().optional(),
  recalculate: z.boolean().optional(),
});
