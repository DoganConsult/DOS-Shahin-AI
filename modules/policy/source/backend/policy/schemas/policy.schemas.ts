/**
 * Zod validation schemas for Policy module.
 * Used with validate() middleware in policy route files.
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
  version: z.string().max(20).optional(),
});

export const updatePolicyBody = createPolicyBody.partial();

export const listPoliciesQuery = paginationQuery.merge(statusFilter).extend({
  category: z.string().optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
});

export const policyVersionBody = z.object({
  version: z.string().min(1).max(20),
  change_summary: z.string().optional(),
});

export const bulkDeletePoliciesBody = bulkIdsBody;

export const createAttestationCampaignBody = z.object({
  policy_id: z.string().min(1),
  title: z.string().min(3).max(255),
  due_date: z.string().datetime({ offset: true }),
  recipient_roles: z.array(z.string().max(100)).min(1),
});

export const recordAttestationBody = z.object({
  campaign_id: z.string().min(1),
  acknowledged: z.boolean().default(true),
  comments: z.string().max(2000).optional(),
});

export const policyDistributionBody = z.object({
  policy_id: z.string().min(1),
  recipient_ids: z.array(z.string().min(1)).min(1),
  notification_channel: z.enum(['email', 'in_app', 'both']).default('both'),
});

export const policyExceptionRequestBody = z.object({
  policy_id: z.string().min(1),
  reason: z.string().min(10).max(5000),
  compensating_controls: z.string().max(2000).optional(),
  requested_duration_days: z.coerce.number().int().min(1).max(365).optional(),
});

export const reviewPolicyExceptionBody = z.object({
  decision: z.enum(['approved', 'rejected']),
  comments: z.string().max(2000).optional(),
});


// ── Response Schemas ──────────────────────────────────────────
export const policyResponseSchema = z.object({
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

export const policyListResponseSchema = z.object({
  data: z.array(policyResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const policyEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('policy'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const policyStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const policyImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const policyImportBatchSchema = z.object({
  rows: z.array(policyImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const policyExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const policyAdminConfigSchema = z.object({
  moduleCode: z.literal('policy'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const policyBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const policyBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createRootBody = z.object({
      title: z.string().min(1),
      content: z.unknown().optional(),
      description: z.unknown().optional(),
      category: z.unknown().optional(),
      frameworks: z.unknown().optional(),
      next_review_date: z.unknown().optional(),
      review_frequency: z.unknown().optional(),
      effective_date: z.unknown().optional(),
      expiry_date: z.unknown().optional(),
      linked_controls: z.unknown().optional(),
      tags: z.unknown().optional(),
    });

export type CreateRootBodyInput = z.infer<typeof createRootBody>;

export let updateIdBody = z.object({
      change_summary: z.unknown().optional(),
    });

export type UpdateIdBodyInput = z.infer<typeof updateIdBody>;

export let createIdApproveBody = z.object({});

export type CreateIdApproveBodyInput = z.infer<typeof createIdApproveBody>;

export let createCampaignsBody = z.object({});

export type CreateCampaignsBodyInput = z.infer<typeof createCampaignsBody>;

export let createCampaignscampaignIdRemindersBody = z.object({});

export type CreateCampaignscampaignIdRemindersBodyInput = z.infer<typeof createCampaignscampaignIdRemindersBody>;

export let createSubmitBody = z.object({
      campaignId: z.unknown().optional(),
      action: z.unknown().optional(),
    });

export type CreateSubmitBodyInput = z.infer<typeof createSubmitBody>;

export let createValidateBody = z.object({});

export type CreateValidateBodyInput = z.infer<typeof createValidateBody>;

export let createImportBody = z.object({
      json: z.string().min(1),
    });

export type CreateImportBodyInput = z.infer<typeof createImportBody>;

export let createExportBody = z.object({
      rules: z.string().min(1),
    });

export type CreateExportBodyInput = z.infer<typeof createExportBody>;

export let updatePoliciesidRulesBody = z.object({
      rules: z.string().min(1),
    });

export type UpdatePoliciesidRulesBodyInput = z.infer<typeof updatePoliciesidRulesBody>;

export let createPoliciesidExecuteBody = z.object({
      context: z.string().min(1),
    });

export type CreatePoliciesidExecuteBodyInput = z.infer<typeof createPoliciesidExecuteBody>;

export let createSimulateBody = z.object({
      policyId: z.string().min(1),
      simulationType: z.unknown().optional(),
      maxDepth: z.unknown().optional(),
      includeIndirect: z.unknown().optional(),
    });

export type CreateSimulateBodyInput = z.infer<typeof createSimulateBody>;

export let createSimulateBatchBody = z.object({
      policyIds: z.string().min(1),
      simulationType: z.string().min(1),
      maxDepth: z.unknown().optional(),
    });

export type CreateSimulateBatchBodyInput = z.infer<typeof createSimulateBatchBody>;

export let createTemplateskeyPreviewBody = z.object({
      overrides: z.unknown().optional(),
    });

export type CreateTemplateskeyPreviewBodyInput = z.infer<typeof createTemplateskeyPreviewBody>;

export let createTemplateskeyGenerateBody = z.object({
      overrides: z.unknown().optional(),
    });

export type CreateTemplateskeyGenerateBodyInput = z.infer<typeof createTemplateskeyGenerateBody>;

export let createBulkgenerateBody = z.object({
      templateKeys: z.unknown().optional(),
      overrides: z.unknown().optional(),
    });

export type CreateBulkgenerateBodyInput = z.infer<typeof createBulkgenerateBody>;

export let createSeedBody = z.object({});

export type CreateSeedBodyInput = z.infer<typeof createSeedBody>;

export let createProcesspolicyIdInitBody = z.object({});

export type CreateProcesspolicyIdInitBodyInput = z.infer<typeof createProcesspolicyIdInitBody>;

export let createProcesspolicyIdAdvanceBody = z.object({
      stepKey: z.string().min(1),
      action: z.unknown().optional(),
      notes: z.unknown().optional(),
    });

export type CreateProcesspolicyIdAdvanceBodyInput = z.infer<typeof createProcesspolicyIdAdvanceBody>;

export let createMomBody = z.object({});

export type CreateMomBodyInput = z.infer<typeof createMomBody>;

export let createMommomIdApproveBody = z.object({});

export type CreateMommomIdApproveBodyInput = z.infer<typeof createMommomIdApproveBody>;

export let createGuidanceBody = z.object({});

export type CreateGuidanceBodyInput = z.infer<typeof createGuidanceBody>;

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

export const createLinkBody = z.object({
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

export const createRenewBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCloseBody = z.object({
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

export const createRemindBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRecallBody = z.object({
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


export const createCapaBody = (..._args: any[]): any => { return {} as any; };
export const updateCapaBody = (..._args: any[]): any => { return {} as any; };
export const createConformanceBody = (..._args: any[]): any => { return {} as any; };
export const createCheckPermissionBody = (..._args: any[]): any => { return {} as any; };
export const createGatesBody = (..._args: any[]): any => { return {} as any; };
export const createUploadBody = (..._args: any[]): any => { return {} as any; };