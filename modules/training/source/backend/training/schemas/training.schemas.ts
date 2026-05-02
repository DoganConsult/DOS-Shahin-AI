/**
 * Zod validation schemas for Training module.
 * Used with validate() middleware in training route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createTrainingBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  type: z.string().max(100).optional(),
  owner: z.string().optional(),
  due_date: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  completion_deadline: z.string().datetime({ offset: true }).optional(),
  control_ids: z.array(z.string()).optional(),
});

export const updateTrainingBody = createTrainingBody.partial();

export const listTrainingsQuery = paginationQuery.merge(statusFilter).extend({
  owner: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});

export const recordCompletionBody = z.object({
  completed_at: z.string().datetime({ offset: true }).optional(),
  score: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const bulkDeleteTrainingsBody = bulkIdsBody;

export const createAssessmentBody = z.object({
  training_id: z.string().min(1),
  title: z.string().min(3).max(255),
  passing_score: z.coerce.number().int().min(0).max(100).default(70),
  max_attempts: z.coerce.number().int().min(1).max(10).default(3),
  time_limit_minutes: z.coerce.number().int().min(1).max(480).optional(),
  questions: z.array(z.object({
    question_text: z.string().min(1).max(2000),
    question_type: z.enum(['multiple_choice', 'true_false', 'open_ended']),
    options: z.array(z.string().max(500)).optional(),
    correct_answer: z.string().max(500).optional(),
  })).min(1),
});

export const submitAssessmentBody = z.object({
  assessment_id: z.string().min(1),
  answers: z.array(z.object({
    question_id: z.string().min(1),
    answer: z.string().max(5000),
  })).min(1),
});


// ── Response Schemas ──────────────────────────────────────────
export const trainingResponseSchema = z.object({
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

export const trainingListResponseSchema = z.object({
  data: z.array(trainingResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const trainingEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('training'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const trainingStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const trainingImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const trainingImportBatchSchema = z.object({
  rows: z.array(trainingImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const trainingExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const trainingAdminConfigSchema = z.object({
  moduleCode: z.literal('training'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const trainingBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const trainingBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createCampaignsBody = z.object({
      title: z.string().min(1).max(255),
      content_ids: z.array(z.string()).optional(),
      target_users: z.array(z.string()).optional(),
      start_date: z.string().datetime({ offset: true }).optional(),
      end_date: z.string().datetime({ offset: true }).optional(),
      owner_id: z.string().optional(),
    });

export type CreateCampaignsBodyInput = z.infer<typeof createCampaignsBody>;

export let createCampaignscampaignIdLaunchBody = z.object({});

export type CreateCampaignscampaignIdLaunchBodyInput = z.infer<typeof createCampaignscampaignIdLaunchBody>;

export let createAssignmentsBody = z.object({
      user_id: z.string().min(1),
      content_id: z.string().min(1),
      due_date: z.string().datetime({ offset: true }).optional(),
      assigned_by: z.string().optional(),
    });

export type CreateAssignmentsBodyInput = z.infer<typeof createAssignmentsBody>;

export let createPhishingBody = z.object({
      title: z.string().min(1).max(255),
      template_type: z.string().optional(),
      target_users: z.array(z.string()).optional(),
    });

export type CreatePhishingBodyInput = z.infer<typeof createPhishingBody>;

export let createPhishingphishingIdLaunchBody = z.object({});

export type CreatePhishingphishingIdLaunchBodyInput = z.infer<typeof createPhishingphishingIdLaunchBody>;

export let createPhishingphishingIdResultBody = z.object({
      user_id: z.string().min(1),
      clicked: z.boolean(),
      reported: z.boolean().optional(),
    });

export type CreatePhishingphishingIdResultBodyInput = z.infer<typeof createPhishingphishingIdResultBody>;

export let createCertificationscertificateIdRevokeBody = z.object({
      reason: z.string().max(2000).optional(),
    });

export type CreateCertificationscertificateIdRevokeBodyInput = z.infer<typeof createCertificationscertificateIdRevokeBody>;

export let createSectorpathsectorCodeAssignBody = z.object({
      userId: z.string().min(1),
      userRole: z.string().optional(),
    });

export type CreateSectorpathsectorCodeAssignBodyInput = z.infer<typeof createSectorpathsectorCodeAssignBody>;

export let createLoadBody = z.object({
      volume: z.unknown().optional(),
    });

export type CreateLoadBodyInput = z.infer<typeof createLoadBody>;

export let createPurgeBody = z.object({});

export type CreatePurgeBodyInput = z.infer<typeof createPurgeBody>;

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

