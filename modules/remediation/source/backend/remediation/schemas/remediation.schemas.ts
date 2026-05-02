/**
 * Zod validation schemas for Remediation module.
 * Used with validate() middleware in remediation route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createRemediationBody = z.object({
  finding_id: z.string().uuid().optional(),
  control_id: z.string().uuid().optional(),
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  owner: z.string().optional(),
  target_date: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['open', 'in_progress', 'pending_verification', 'verified', 'closed', 'reopened']).default('open'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export const updateRemediationBody = createRemediationBody.partial();

export const listRemediationsQuery = paginationQuery.merge(statusFilter).extend({
  finding_id: z.string().optional(),
  control_id: z.string().optional(),
  owner: z.string().optional(),
  status: z.string().optional(),
});

export const bulkDeleteRemediationsBody = bulkIdsBody;
export const bulkUpdateRemediationsBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  update: updateRemediationBody,
});

export const addRemediationEvidenceBody = z.object({
  evidence_id: z.string().uuid(),
  notes: z.string().max(2000).optional(),
});

export const closeRemediationBody = z.object({
  closure_notes: z.string().max(5000).optional(),
  effectiveness: z.enum(['effective', 'partially_effective', 'ineffective']).optional(),
  evidence_ids: z.array(z.string().uuid()).optional(),
});

export const reassignRemediationBody = z.object({
  new_owner: z.string().min(1),
  reason: z.string().max(2000).optional(),
  new_target_date: z.string().datetime({ offset: true }).optional(),
});


// ── Response Schemas ──────────────────────────────────────────
export const remediationResponseSchema = z.object({
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

export const remediationListResponseSchema = z.object({
  data: z.array(remediationResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const remediationEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('remediation'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const remediationStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const remediationImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const remediationImportBatchSchema = z.object({
  rows: z.array(remediationImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const remediationExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const remediationAdminConfigSchema = z.object({
  moduleCode: z.literal('remediation'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const remediationBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const remediationBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createRootBody = z.object({
      title: z.string().min(1),
      description: z.unknown().optional(),
      severity: z.unknown().optional(),
      source: z.unknown().optional(),
    });

export type CreateRootBodyInput = z.infer<typeof createRootBody>;

export let updateIdBody = z.object({
      status: z.unknown().optional(),
    });

export type UpdateIdBodyInput = z.infer<typeof updateIdBody>;

export let createCheckoverdueBody = z.object({});

export type CreateCheckoverdueBodyInput = z.infer<typeof createCheckoverdueBody>;

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

export const createBlockersBody = z.object({
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

export const createVerificationsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEvidenceBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

