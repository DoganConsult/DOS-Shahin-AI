/**
 * Zod validation schemas for Qiyas (Assessment / Measurement) module.
 * Used with validate() middleware in qiyas route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

// -- Assessment CRUD ----------------------------------------------------------

export const createAssessmentBody = z.object({
  name: z.string().min(1).max(255),
  framework_id: z.string().uuid(),
  description: z.string().optional(),
  status: z.enum(['draft', 'in_progress', 'scored', 'reviewed', 'finalized', 'rescoring', 'completed', 'archived']).default('draft'),
  due_date: z.string().datetime({ offset: true }).optional(),
});

export const updateAssessmentBody = createAssessmentBody.partial();

export const listAssessmentsQuery = paginationQuery.merge(statusFilter).extend({
  framework_id: z.string().optional(),
});

// -- Question CRUD ------------------------------------------------------------

export const createQuestionBody = z.object({
  text: z.string().min(1).max(2000),
  category: z.string().min(1).max(100),
  weight: z.coerce.number().min(0).max(100).default(1),
  assessment_id: z.string().uuid().optional(),
  question_type: z.enum(['yes_no', 'scale', 'text', 'multi_choice']).optional(),
});

export const updateQuestionBody = createQuestionBody.partial();

export const listQuestionsQuery = paginationQuery.extend({
  assessment_id: z.string().optional(),
  category: z.string().optional(),
  question_type: z.string().optional(),
});

// -- Scoring Rule -------------------------------------------------------------

export const createScoringRuleBody = z.object({
  rule_name: z.string().min(1).max(255),
  assessment_id: z.string().uuid(),
  conditions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
  score_value: z.coerce.number().min(0).max(100),
  active: z.boolean().default(true),
});

export const updateScoringRuleBody = createScoringRuleBody.partial();

export const listScoringRulesQuery = paginationQuery.extend({
  assessment_id: z.string().optional(),
  active: z.coerce.boolean().optional(),
});

// -- Bulk Operations ----------------------------------------------------------

export const bulkDeleteAssessmentsBody = bulkIdsBody;
export const bulkDeleteQuestionsBody = bulkIdsBody;
export const bulkDeleteScoringRulesBody = bulkIdsBody;


// ── Response Schemas ──────────────────────────────────────────
export const qiyasResponseSchema = z.object({
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

export const qiyasListResponseSchema = z.object({
  data: z.array(qiyasResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const qiyasEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('qiyas'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const qiyasStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const qiyasImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const qiyasImportBatchSchema = z.object({
  rows: z.array(qiyasImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const qiyasExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const qiyasAdminConfigSchema = z.object({
  moduleCode: z.literal('qiyas'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const qiyasBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const qiyasBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});

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

export const createObjectivesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateObjectivesBody = createObjectivesBody.partial();

export const createThemesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPrioritiesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRiskAppetiteBody = z.object({
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

export const createSnapshotsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRoadmapBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateRoadmapBody = createRoadmapBody.partial();

export const createGenerateBody = z.object({
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

