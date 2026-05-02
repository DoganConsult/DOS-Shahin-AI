/**
 * Zod validation schemas for Audit module.
 * Used with validate() middleware in audit route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createEngagementBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned'),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  owner: z.string().optional(),
  scope: z.string().optional(),
});

export const updateEngagementBody = createEngagementBody.partial();

export const createAuditPlanBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  status: z.string().optional(),
  owner: z.string().optional(),
});

export const updateAuditPlanBody = createAuditPlanBody.partial();

export const createFindingBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['open', 'in_remediation', 'closed']).default('open'),
  engagement_id: z.string().uuid().optional(),
  plan_id: z.string().uuid().optional(),
  owner: z.string().optional(),
  control_ids: z.array(z.string().uuid()).optional(),
});

export const updateFindingBody = createFindingBody.partial();

export const createRootCauseBody = z.object({
  description: z.string().min(1),
  category: z.string().optional(),
});

export const createImpactBody = z.object({
  description: z.string().min(1),
  category: z.string().optional(),
});

export const statusBody = z.object({
  status: z.string().min(1),
});

export const listEngagementsQuery = paginationQuery.merge(statusFilter).extend({
  owner: z.string().optional(),
});

export const listFindingsQuery = paginationQuery.extend({
  engagement_id: z.string().uuid().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
});

export const bulkDeleteFindingsBody = bulkIdsBody;

// ── Bulk Operations ─────────────────────────────────────────────

export const bulkUpdateFindingsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateFindingBody,
});


// ── Response Schemas ──────────────────────────────────────────
export const auditResponseSchema = z.object({
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

export const auditListResponseSchema = z.object({
  data: z.array(auditResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const auditEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('audit'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const auditStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const auditImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const auditImportBatchSchema = z.object({
  rows: z.array(auditImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const auditExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const auditAdminConfigSchema = z.object({
  moduleCode: z.literal('audit'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const auditBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const auditBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createCapaEffectivenessBody = z.object({
      capaId: z.string().min(1),
      testResult: z.string().min(1),
    });

export type CreateCapaEffectivenessBodyInput = z.infer<typeof createCapaEffectivenessBody>;

export let syncToRiskBody = z.object({
      findingId: z.string().min(1),
    });

export type SyncToRiskBodyInput = z.infer<typeof syncToRiskBody>;

export let linkComplianceBody = z.object({
      findingId: z.string().min(1),
      violationId: z.string().min(1),
    });

export type LinkComplianceBodyInput = z.infer<typeof linkComplianceBody>;

export let createCoordinationBody = z.object({
      auditId: z.string().min(1),
      externalParty: z.string().min(1),
    });

export type CreateCoordinationBodyInput = z.infer<typeof createCoordinationBody>;

export let updateCoordinationBody = z.object({});

export type UpdateCoordinationBodyInput = z.infer<typeof updateCoordinationBody>;

export let idParam = z.object({ id: z.string().min(1) });

export type IdParamInput = z.infer<typeof idParam>;

export let upsertSlaBody = z.object({
      severity: z.string().min(1),
      resolutionDays: z.number().int().positive(),
      warningPct: z.number().optional(),
      escalationTo: z.string().optional(),
    });

export type UpsertSlaBodyInput = z.infer<typeof upsertSlaBody>;

export let createAuditPackageBody = z.object({
      name: z.string().optional(),
      frameworkId: z.string().optional(),
    });

export type CreateAuditPackageBodyInput = z.infer<typeof createAuditPackageBody>;

export let createQaReviewBody = z.object({
      auditId: z.string().min(1),
      reviewType: z.string().min(1),
    });

export type CreateQaReviewBodyInput = z.infer<typeof createQaReviewBody>;

export let rejectReviewBody = z.object({
      comments: z.string().optional(),
    });

export type RejectReviewBodyInput = z.infer<typeof rejectReviewBody>;

export let setRatingBody = z.object({
      auditId: z.string().min(1),
      rating: z.string().min(1),
    });

export type SetRatingBodyInput = z.infer<typeof setRatingBody>;

export let createRequirementBody = z.object({
      title: z.string().min(1),
      regulatoryBody: z.string().min(1),
    });

export type CreateRequirementBodyInput = z.infer<typeof createRequirementBody>;

export let updateRequirementBody = z.object({});

export type UpdateRequirementBodyInput = z.infer<typeof updateRequirementBody>;

export let linkAuditBody = z.object({
      auditId: z.string().min(1),
    });

export type LinkAuditBodyInput = z.infer<typeof linkAuditBody>;

export let generateRemindersBody = z.object({});

export type GenerateRemindersBodyInput = z.infer<typeof generateRemindersBody>;

export let linkRepeatFindingBody = z.object({
      findingId: z.string().min(1),
      originalFindingId: z.string().min(1),
    });

export type LinkRepeatFindingBodyInput = z.infer<typeof linkRepeatFindingBody>;

export let upsertScoreBody = z.object({
      universeId: z.string().min(1),
      riskFactor: z.string().min(1),
      score: z.number(),
      weight: z.number().optional(),
      assessedBy: z.string().optional(),
    });

export type UpsertScoreBodyInput = z.infer<typeof upsertScoreBody>;

export let createScheduleBody = z.object({
      title: z.string().min(1),
      cronExpression: z.string().min(1),
    });

export type CreateScheduleBodyInput = z.infer<typeof createScheduleBody>;

export let updateScheduleBody = z.object({});

export type UpdateScheduleBodyInput = z.infer<typeof updateScheduleBody>;

export let assignMemberBody = z.object({
      auditId: z.string().min(1),
      userId: z.string().min(1),
      role: z.string().min(1),
    });

export type AssignMemberBodyInput = z.infer<typeof assignMemberBody>;

export let updateHoursBody = z.object({
      hoursActual: z.number(),
    });

export type UpdateHoursBodyInput = z.infer<typeof updateHoursBody>;

export let createTemplateBody = z.object({
      name: z.string().min(1),
      templateType: z.string().min(1),
    });

export type CreateTemplateBodyInput = z.infer<typeof createTemplateBody>;

export let updateTemplateBody = z.object({});

export type UpdateTemplateBodyInput = z.infer<typeof updateTemplateBody>;

export let applyTemplateBody = z.object({
      auditId: z.string().min(1),
    });

export type ApplyTemplateBodyInput = z.infer<typeof applyTemplateBody>;

export let createTestPlanBody = z.object({
      auditId: z.string().min(1),
      controlId: z.string().min(1),
      testProcedure: z.string().min(1),
    });

export type CreateTestPlanBodyInput = z.infer<typeof createTestPlanBody>;

export let updateTestResultBody = z.object({
      status: z.string().min(1),
      resultNotes: z.string().optional(),
      testedBy: z.string().optional(),
    });

export type UpdateTestResultBodyInput = z.infer<typeof updateTestResultBody>;

export let logTimeBody = z.object({
      auditId: z.string().min(1),
      userId: z.string().min(1),
      hours: z.number().positive(),
    });

export type LogTimeBodyInput = z.infer<typeof logTimeBody>;

export let createUniverseEntityBody = z.object({
      name: z.string().min(1),
      entityType: z.string().min(1),
    });

export type CreateUniverseEntityBodyInput = z.infer<typeof createUniverseEntityBody>;

export let updateUniverseEntityBody = z.object({});

export type UpdateUniverseEntityBodyInput = z.infer<typeof updateUniverseEntityBody>;

export let linkFoundationBody = z.object({
      foundationEntityId: z.string().min(1),
    });

export type LinkFoundationBodyInput = z.infer<typeof linkFoundationBody>;

export let createPaperBody = z.object({
      auditId: z.string().min(1),
      title: z.string().min(1),
    });

export type CreatePaperBodyInput = z.infer<typeof createPaperBody>;

export let updatePaperBody = z.object({});

export type UpdatePaperBodyInput = z.infer<typeof updatePaperBody>;

export let submitForReviewBody = z.object({
      reviewerId: z.string().min(1),
    });

export type SubmitForReviewBodyInput = z.infer<typeof submitForReviewBody>;

export let createCapaBody = z.object({ finding_id: z.string().min(1), title: z.string().min(1) });

export type CreateCapaBodyInput = z.infer<typeof createCapaBody>;

export let linkTreatmentBody = z.object({ treatmentId: z.string().min(1) });

export type LinkTreatmentBodyInput = z.infer<typeof linkTreatmentBody>;

export let closureReviewBody = z.object({ finding_id: z.string().min(1), outcome: z.string().min(1) });

export type ClosureReviewBodyInput = z.infer<typeof closureReviewBody>;

export let collectEvidenceBody = z.object({ controlId: z.string().min(1), title: z.string().min(1) });

export type CollectEvidenceBodyInput = z.infer<typeof collectEvidenceBody>;

export let generatePostBody = z.object({
      frameworkId: z.string(),
      frameworkIds: z.array(z.unknown()),
      assessmentId: z.string(),
      auditId: z.string(),
      includeNotTested: z.string().optional(),
    });

export type GeneratePostBodyInput = z.infer<typeof generatePostBody>;

export let generateBatchPostBody = z.object({
      frameworkIds: z.array(z.unknown()),
      includeNotTested: z.string().optional(),
    });

export type GenerateBatchPostBodyInput = z.infer<typeof generateBatchPostBody>;

export const createPlanBody = z.object({ title: z.string().min(1) });
export type CreatePlanInput = z.infer<typeof createPlanBody>;

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


export const createStatusBody = (..._args: any[]): any => { return {} as any; };
export const createMarkOverdueBody = (..._args: any[]): any => { return {} as any; };