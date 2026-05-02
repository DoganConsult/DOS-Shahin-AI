import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createDsrBody = z.object({
  subject_name: z.string().min(1).max(255),
  subject_email: z.string().email(),
  request_type: z.enum(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection']),
  description: z.string().max(5000).optional(),
  national_id_hash: z.string().max(255).optional(),
  urgency: z.enum(['standard', 'urgent']).default('standard'),
  regulation: z.enum(['PDPL', 'GDPR', 'CCPA', 'other']).default('PDPL'),
  source_channel: z.enum(['portal', 'email', 'phone', 'in_person', 'api']).default('portal'),
});

export const updateDsrBody = createDsrBody.partial();

export const listDsrQuery = paginationQuery.merge(statusFilter).extend({
  request_type: z.string().optional(),
  regulation: z.string().optional(),
  urgency: z.string().optional(),
  search: z.string().max(200).optional(),
});

export const bulkDeleteDsrBody = bulkIdsBody;

export const completeDsrBody = z.object({
  resolution: z.string().min(1).max(5000),
  data_provided: z.boolean().optional(),
  evidence_id: z.string().uuid().optional(),
});

export const extendDsrBody = z.object({
  reason: z.string().min(1).max(2000),
  new_due_date: z.string().datetime({ offset: true }),
});

export const createPiaBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  processing_activity: z.string().min(1).max(500),
  data_categories: z.array(z.string().max(100)).min(1),
  legal_basis: z.enum(['consent', 'contract', 'legal_obligation', 'vital_interest', 'public_task', 'legitimate_interest']),
  risk_level: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
});

export const createConsentRecordBody = z.object({
  subject_id: z.string().min(1),
  purpose: z.string().min(1).max(500),
  legal_basis: z.string().max(200),
  granted: z.boolean(),
  expiry_date: z.string().datetime({ offset: true }).optional(),
  channel: z.enum(['web', 'mobile', 'email', 'paper']).default('web'),
});

export const createDataMapBody = z.object({
  system_name: z.string().min(1).max(255),
  data_categories: z.array(z.string().max(100)).min(1),
  processing_purposes: z.array(z.string().max(200)).min(1),
  storage_location: z.string().max(255).optional(),
  retention_period_days: z.coerce.number().int().min(1).optional(),
  cross_border: z.boolean().default(false),
});


// ── Response Schemas ──────────────────────────────────────────
export const privacyResponseSchema = z.object({
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

export const privacyListResponseSchema = z.object({
  data: z.array(privacyResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const privacyEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('privacy'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const privacyStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const privacyImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const privacyImportBatchSchema = z.object({
  rows: z.array(privacyImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const privacyExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const privacyAdminConfigSchema = z.object({
  moduleCode: z.literal('privacy'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const privacyBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const privacyBulkStatusChangeSchema = z.object({
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

export const createBreachesBody = z.object({
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

export const createConsentsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createWithdrawBody = z.object({
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

export const createTransfersBody = z.object({
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

export const createDataMappingBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

