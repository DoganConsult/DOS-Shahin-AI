/**
 * Zod validation schemas for Vendor module.
 * Used with validate() middleware in vendor route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createVendorBody = z.object({
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  tier: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['prospect', 'due_diligence', 'onboarded', 'active', 'review_due', 'offboarding', 'offboarded', 'rejected']).default('prospect'),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().regex(/^\+?[\d\s\-()]{7,20}$/).optional(),
  sla_notes: z.string().optional(),
});

export const updateVendorBody = createVendorBody.partial();

export const listVendorsQuery = paginationQuery.merge(statusFilter).extend({
  category: z.string().optional(),
  tier: z.string().optional(),
  search: z.string().max(200).optional(),
});

export const bulkDeleteVendorsBody = bulkIdsBody;
export const bulkUpdateVendorsBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  update: updateVendorBody,
});

export const createDueDiligenceBody = z.object({
  vendor_id: z.string().min(1),
  scope: z.string().max(500).optional(),
  due_date: z.string().datetime({ offset: true }).optional(),
  assigned_to: z.string().optional(),
});

export const createEngagementBody = z.object({
  vendor_id: z.string().min(1),
  title: z.string().min(3).max(255),
  contract_value: z.coerce.number().min(0).optional(),
  start_date: z.string().datetime({ offset: true }).optional(),
  end_date: z.string().datetime({ offset: true }).optional(),
  renewal_type: z.enum(['auto', 'manual', 'none']).default('manual'),
}).refine(d => !d.start_date || !d.end_date || d.start_date <= d.end_date, {
  message: 'start_date must be before end_date', path: ['end_date'],
});

export const recordSLAMetricBody = z.object({
  vendor_id: z.string().min(1),
  metric_name: z.string().min(1).max(100),
  target_value: z.coerce.number(),
  actual_value: z.coerce.number(),
  measurement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const vendorPortalTokenBody = z.object({
  vendor_id: z.string().min(1),
  expiry_hours: z.coerce.number().int().min(1).max(720).default(24),
});

export const vendorQuestionnaireBody = z.object({
  vendor_id: z.string().min(1),
  questionnaire_type: z.string().max(100),
  responses: z.array(z.object({
    question_id: z.string().min(1),
    answer: z.string().max(5000),
  })).min(1),
});


// ── Response Schemas ──────────────────────────────────────────
export const vendorResponseSchema = z.object({
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

export const vendorListResponseSchema = z.object({
  data: z.array(vendorResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const vendorEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('vendor'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const vendorStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const vendorImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const vendorImportBatchSchema = z.object({
  rows: z.array(vendorImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const vendorExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const vendorAdminConfigSchema = z.object({
  moduleCode: z.literal('vendor'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const vendorBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const vendorBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let publishFindingBody = z.object({
      title: z.string().min(1, "title is required"),
      description: z.string().min(1, "description is required"),
      severity: z.string().min(1, "severity is required"),
      recommendation: z.string().min(1, "recommendation is required"),
      frameworkRef: z.string().optional(),
    });

export type PublishFindingBodyInput = z.infer<typeof publishFindingBody>;

export let createDuediligenceBody = z.object({
      initiated_by: z.unknown().optional(),
    });

export type CreateDuediligenceBodyInput = z.infer<typeof createDuediligenceBody>;

export let updateDuediligenceStepsstepIdBody = z.object({
      completed_by: z.unknown().optional(),
    });

export type UpdateDuediligenceStepsstepIdBodyInput = z.infer<typeof updateDuediligenceStepsstepIdBody>;

export let createFourthpartyBody = z.object({});

export type CreateFourthpartyBodyInput = z.infer<typeof createFourthpartyBody>;

export let createSlametricBody = z.object({});

export type CreateSlametricBodyInput = z.infer<typeof createSlametricBody>;

export let createConcentrationAssessBody = z.object({});

export type CreateConcentrationAssessBodyInput = z.infer<typeof createConcentrationAssessBody>;

export let createLinksharedsubvendorsBody = z.object({});

export type CreateLinksharedsubvendorsBodyInput = z.infer<typeof createLinksharedsubvendorsBody>;

export let createOffboardingBody = z.object({
      initiated_by: z.unknown().optional(),
    });

export type CreateOffboardingBodyInput = z.infer<typeof createOffboardingBody>;

export let updateOffboardingStepsstepIdBody = z.object({
      completed_by: z.unknown().optional(),
    });

export type UpdateOffboardingStepsstepIdBodyInput = z.infer<typeof updateOffboardingStepsstepIdBody>;

export let createMonitoringBody = z.object({});

export type CreateMonitoringBodyInput = z.infer<typeof createMonitoringBody>;

export let createAutotierBody = z.object({});

export type CreateAutotierBodyInput = z.infer<typeof createAutotierBody>;

export let createRunBody = z.object({});

export type CreateRunBodyInput = z.infer<typeof createRunBody>;

export let createVendorIdFetchBody = z.object({
      provider: z.unknown().optional(),
      apiKey: z.unknown().optional(),
    });

export type CreateVendorIdFetchBodyInput = z.infer<typeof createVendorIdFetchBody>;

export let createBulkfetchBody = z.object({
      provider: z.unknown().optional(),
      apiKey: z.unknown().optional(),
    });

export type CreateBulkfetchBodyInput = z.infer<typeof createBulkfetchBody>;

export let createTokenBody = z.object({
      vendorId: z.unknown().optional(),
    });

export type CreateTokenBodyInput = z.infer<typeof createTokenBody>;

export let createValidateBody = z.object({
      token: z.unknown().optional(),
    });

export type CreateValidateBodyInput = z.infer<typeof createValidateBody>;

export let createSubmissionsBody = z.object({});

export type CreateSubmissionsBodyInput = z.infer<typeof createSubmissionsBody>;

export let createSubmissionssubmissionIdReviewBody = z.object({});

export type CreateSubmissionssubmissionIdReviewBodyInput = z.infer<typeof createSubmissionssubmissionIdReviewBody>;

export let updateVendorIdProfileBody = z.object({
      name: z.unknown().optional(),
      industry: z.unknown().optional(),
    });

export type UpdateVendorIdProfileBodyInput = z.infer<typeof updateVendorIdProfileBody>;

export let createVendorIdQuestionnairesqidRespondBody = z.object({
      responses: z.unknown().optional(),
    });

export type CreateVendorIdQuestionnairesqidRespondBodyInput = z.infer<typeof createVendorIdQuestionnairesqidRespondBody>;

export let updateVendorIdActionitemsitemIdBody = z.object({
      status: z.unknown().optional(),
    });

export type UpdateVendorIdActionitemsitemIdBodyInput = z.infer<typeof updateVendorIdActionitemsitemIdBody>;

export let createVendorIdDocumentsBody = z.object({
      fileName: z.unknown().optional(),
      fileType: z.unknown().optional(),
      fileSize: z.unknown().optional(),
    });

export type CreateVendorIdDocumentsBodyInput = z.infer<typeof createVendorIdDocumentsBody>;

export let createVendorIdMessagesBody = z.object({
      subject: z.unknown().optional(),
      body: z.unknown().optional(),
      senderId: z.unknown().optional(),
      senderType: z.unknown().optional(),
      parentMessageId: z.unknown().optional(),
    });

export type CreateVendorIdMessagesBodyInput = z.infer<typeof createVendorIdMessagesBody>;

export let patchVendorIdMessagesmessageIdReadBody = z.object({});

export type PatchVendorIdMessagesmessageIdReadBodyInput = z.infer<typeof patchVendorIdMessagesmessageIdReadBody>;

export let createVendorsidClassifyBody = z.object({
      dataAccess: z.unknown().optional(),
      criticality: z.unknown().optional(),
      regulatoryExposure: z.unknown().optional(),
    });

export type CreateVendorsidClassifyBodyInput = z.infer<typeof createVendorsidClassifyBody>;

export let createVendorsOnboardBody = z.object({
      name: z.string().min(1),
      category: z.unknown().optional(),
      factors: z.unknown().optional(),
      completedSteps: z.unknown().optional(),
      contactEmail: z.unknown().optional(),
      contractExpiry: z.unknown().optional(),
    });

export type CreateVendorsOnboardBodyInput = z.infer<typeof createVendorsOnboardBody>;

export let createProfilesidAssessBody = z.object({
      risk_score: z.unknown().optional(),
      findings: z.unknown().optional(),
    });

export type CreateProfilesidAssessBodyInput = z.infer<typeof createProfilesidAssessBody>;

export let createQuestionnairesBody = z.object({
      vendor_name: z.string().min(1),
      template_name: z.unknown().optional(),
    });

export type CreateQuestionnairesBodyInput = z.infer<typeof createQuestionnairesBody>;

export let createVendorsQuestionnairesBody = z.object({
      vendor_name: z.string().min(1),
      template_name: z.unknown().optional(),
    });

export type CreateVendorsQuestionnairesBodyInput = z.infer<typeof createVendorsQuestionnairesBody>;

export let createVendorIdCalculateBody = z.object({
      weights: z.unknown().optional(),
    });

export type CreateVendorIdCalculateBodyInput = z.infer<typeof createVendorIdCalculateBody>;

export let createBulkrecalculateBody = z.object({});

export type CreateBulkrecalculateBodyInput = z.infer<typeof createBulkrecalculateBody>;

export let createVendorIdCyberratingBody = z.object({});

export type CreateVendorIdCyberratingBodyInput = z.infer<typeof createVendorIdCyberratingBody>;

export let idParam = z.object({ id: z.string().min(1) });

export type IdParamInput = z.infer<typeof idParam>;

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

