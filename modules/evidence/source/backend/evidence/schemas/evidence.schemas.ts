/**
 * Zod validation schemas for Evidence module.
 * Used with validate() middleware in evidence route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createEvidenceBody = z.object({
  title: z.string().min(3).max(255),
  type: z.string().max(100).optional(),
  description: z.string().optional(),
  control_ids: z.array(z.string().uuid()).optional(),
  collected_at: z.string().datetime({ offset: true }).optional(),
  valid_until: z.string().datetime({ offset: true }).optional(),
  owner: z.string().optional(),
  source: z.enum(['manual', 'system', 'connector']).optional(),
});

export const updateEvidenceBody = createEvidenceBody.partial();

export const listEvidenceQuery = paginationQuery.merge(statusFilter).extend({
  control_id: z.string().uuid().optional(),
  type: z.string().optional(),
  owner: z.string().optional(),
});

export const evidenceReviewBody = z.object({
  decision: z.enum(['approve', 'reject']),
  comments: z.string().optional(),
});

export const bulkDeleteEvidenceBody = bulkIdsBody;

// ── Bulk Operations ─────────────────────────────────────────────

export const bulkUpdateEvidenceBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateEvidenceBody,
});

// ── Legacy schemas (migrated from flat) ──

export const submitEvidenceBody = z.object({
  title: z.string().min(1).max(255),
  source: z.string().min(1),
  control_id: z.string().uuid(),
  description: z.string().optional(),
  evidence_type: z.string().optional(),
  owner: z.string().optional(),
});

export const createScheduleBody = z.object({
  control_id: z.string().uuid(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annually']),
  next_due: z.string().datetime({ offset: true }).optional(),
  owner: z.string().optional(),
});

export const updateScheduleBody = createScheduleBody.partial();

export const createReviewBody = z.object({
  evidence_id: z.string().uuid(),
  reviewer_id: z.string().uuid().optional(),
  decision: z.enum(['approve', 'reject', 'request_changes']).optional(),
  comments: z.string().optional(),
});

export const createRequestBody = z.object({
  control_id: z.string().uuid(),
  requirement_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().datetime({ offset: true }).optional(),
  instructions: z.string().optional(),
});


// ── Response Schemas ──────────────────────────────────────────
export const evidenceResponseSchema = z.object({
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

export const evidenceListResponseSchema = z.object({
  data: z.array(evidenceResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const evidenceEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('evidence'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const evidenceStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const evidenceImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const evidenceImportBatchSchema = z.object({
  rows: z.array(evidenceImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const evidenceExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const evidenceAdminConfigSchema = z.object({
  moduleCode: z.literal('evidence'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const evidenceBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const evidenceBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createCollectorBody = z.object({
      name: z.string().optional(),
      sourceType: z.string().optional(),
      schedule: z.string().optional(),
      endpointUrl: z.string().optional(),
      linkedControls: z.string().optional(),
    });

export type CreateCollectorBodyInput = z.infer<typeof createCollectorBody>;

export let updateCollectorBody = z.object({
      name: z.string().optional(),
      sourceType: z.string().optional(),
      schedule: z.string().optional(),
      endpointUrl: z.string().optional(),
      linkedControls: z.string().optional(),
    });

export type UpdateCollectorBodyInput = z.infer<typeof updateCollectorBody>;

export let verifyBody = z.object({
      method: z.string().min(1),
      notes: z.string().optional(),
    });

export type VerifyBodyInput = z.infer<typeof verifyBody>;

export let webhooksPipelinePipelineTypePostBody = z.object({});

export type WebhooksPipelinePipelineTypePostBodyInput = z.infer<typeof webhooksPipelinePipelineTypePostBody>;

export let webhooksPipelineGithubPostBody = z.object({});

export type WebhooksPipelineGithubPostBodyInput = z.infer<typeof webhooksPipelineGithubPostBody>;

export let webhooksPipelineGitlabPostBody = z.object({});

export type WebhooksPipelineGitlabPostBodyInput = z.infer<typeof webhooksPipelineGitlabPostBody>;

export let pipelineWebhooksConfigsPostBody = z.object({
      name: z.string(),
      pipelineType: z.string(),
      configId: z.string().optional(),
      webhookSecret: z.string().optional(),
      apiKeyId: z.string().optional(),
      controlIdPattern: z.string().optional(),
      evidenceTypeCode: z.string().optional(),
      enabled: z.boolean().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    });

export type PipelineWebhooksConfigsPostBodyInput = z.infer<typeof pipelineWebhooksConfigsPostBody>;

export let updateSettingBody = z.object({
      key: z.string().min(1),
      value: z.unknown(),
    });

export type UpdateSettingBodyInput = z.infer<typeof updateSettingBody>;

export let addTaxonomyBody = z.object({
      code: z.string().min(1),
      labelEn: z.string().min(1),
      labelAr: z.string().optional(),
    });

export type AddTaxonomyBodyInput = z.infer<typeof addTaxonomyBody>;

export let updateTaxonomyBody = z.object({
      labelEn: z.string().optional(),
      labelAr: z.string().optional(),
      isActive: z.boolean().optional(),
    });

export type UpdateTaxonomyBodyInput = z.infer<typeof updateTaxonomyBody>;

export let expiringQuerySchema = z.object({
      days: z.coerce.number().int().min(1).max(365).optional(),
    });

export type ExpiringQuerySchemaInput = z.infer<typeof expiringQuerySchema>;

export let analyzeEvidenceBody = z.object({
      fileId: z.string().optional(),
    });

export type AnalyzeEvidenceBodyInput = z.infer<typeof analyzeEvidenceBody>;

export let batchAnalyzeBody = z.object({
      evidenceIds: z.array(z.string()).min(1),
    });

export type BatchAnalyzeBodyInput = z.infer<typeof batchAnalyzeBody>;

export let createAttachmentBody = z.object({
      entityType: z.string().min(1),
      entityId: z.string().min(1),
      evidenceTypeCode: z.string().min(1),
      fileName: z.string().min(1),
    });

export type CreateAttachmentBodyInput = z.infer<typeof createAttachmentBody>;

export let submitVersionBody = z.object({});

export type SubmitVersionBodyInput = z.infer<typeof submitVersionBody>;

export let collectEvidenceBody = z.object({
      connectorId: z.string().optional(),
    });

export type CollectEvidenceBodyInput = z.infer<typeof collectEvidenceBody>;

export let policyCheckBody = z.object({
      controlId: z.string().optional(),
      requiredTypes: z.array(z.string()).optional(),
    });

export type PolicyCheckBodyInput = z.infer<typeof policyCheckBody>;

export let transitionStatusBody = z.object({
      status: z.string().min(1),
      reason: z.string().optional(),
    });

export type TransitionStatusBodyInput = z.infer<typeof transitionStatusBody>;

export let requiredTypesBody = z.object({
      requiredEvidenceTypeCodes: z.array(z.string()),
    });

export type RequiredTypesBodyInput = z.infer<typeof requiredTypesBody>;

export let createPackageBody = z.object({
      name: z.string().min(1),
      packageType: z.string().min(1),
      description: z.string().optional(),
      scopeType: z.string().optional(),
      scopeId: z.string().optional(),
    });

export type CreatePackageBodyInput = z.infer<typeof createPackageBody>;

export let addItemsBody = z.object({
      evidenceIds: z.array(z.string()).min(1),
    });

export type AddItemsBodyInput = z.infer<typeof addItemsBody>;

export let exportBody = z.object({
      format: z.string().optional(),
    });

export type ExportBodyInput = z.infer<typeof exportBody>;

export let linkObjectBody = z.object({
      objectType: z.string().min(1),
      objectId: z.string().min(1),
      linkType: z.string().optional(),
      notes: z.string().optional(),
    });

export type LinkObjectBodyInput = z.infer<typeof linkObjectBody>;

export let resolveDuplicateBody = z.object({
      resolution: z.string().min(1),
    });

export type ResolveDuplicateBodyInput = z.infer<typeof resolveDuplicateBody>;

export let updateRequestBody = z.object({
      status: z.string().optional(),
      submissionNotes: z.string().optional(),
    });

export type UpdateRequestBodyInput = z.infer<typeof updateRequestBody>;

export let taskIdParam = z.object({
      id: z.string().uuid("Invalid task ID format"),
    });

export type TaskIdParamInput = z.infer<typeof taskIdParam>;

export let statusUpdateBody = z.object({
      status: z.string().min(1, "status is required"),
    });

export type StatusUpdateBodyInput = z.infer<typeof statusUpdateBody>;

export let submitBody = z.object({
      notes: z.string().optional(),
    });

export type SubmitBodyInput = z.infer<typeof submitBody>;

export let listTasksQuery = z.object({
      department_id: z.string().optional(),
      business_unit_id: z.string().optional(),
      status: z.string().optional(),
    });

export type ListTasksQueryInput = z.infer<typeof listTasksQuery>;

export let scheduleIdParam = z.object({
      id: z.string().min(1, "Schedule ID is required"),
    });

export type ScheduleIdParamInput = z.infer<typeof scheduleIdParam>;

export let patchScheduleBody = z.object({
      enabled: z.boolean().optional(),
      cron_expression: z.string().optional(),
    }).refine(d => d.enabled !== undefined || d.cron_expression, {
      message: "At least one field (enabled or cron_expression) is required",
    });

export type PatchScheduleBodyInput = z.infer<typeof patchScheduleBody>;

export const bulkStaleBody = z.object({ evidenceIds: z.array(z.string()).min(1) });
export const bulkExtendBody = z.object({ evidenceIds: z.array(z.string()).min(1), daysToAdd: z.number().min(1) });
export const bulkRefreshBody = z.object({ evidenceIds: z.array(z.string()).min(1) });

// ── Auto-generated validation schemas (enterprise hardening) ──

// ── Param Schemas (DELETE endpoint validation) ──────────────────
export const configIdParam = z.object({
  configId: z.string().min(1, 'Config ID is required'),
});

export const packageItemParams = z.object({
  id: z.string().min(1, 'Package ID is required'),
  itemId: z.string().min(1, 'Item ID is required'),
});

export const evidenceLinkParams = z.object({
  id: z.string().min(1, 'Evidence ID is required'),
  linkId: z.string().min(1, 'Link ID is required'),
});

export const createGenerateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createGenerateNowBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

