/**
 * Zod validation schemas for Action module.
 * Used with validate() middleware in action route files.
 * @owner Module:action
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../schemas/common.schemas';

// ── Status Enum ─────────────────────────────────────────────────

export const actionStatusEnum = z.enum([
  'open', 'in_progress', 'completed', 'verified',
  'closed', 'overdue', 'escalated', 'cancelled',
]);

export type ActionStatus = z.infer<typeof actionStatusEnum>;

// ── Core CRUD ───────────────────────────────────────────────────

export const createActionBody = z.object({
  title: z.string().min(3).max(500),
  description: z.string().max(5000).optional(),
  actionType: z.enum(['corrective', 'preventive', 'detective', 'improvement']),
  assignedTo: z.string().uuid(),
  sourceType: z.enum(['risk', 'audit', 'incident', 'compliance', 'policy', 'vendor', 'manual']),
  sourceId: z.string().min(1),
  deadline: z.string().datetime({ offset: true }).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
});

export const updateActionBody = createActionBody.partial();

// ── Lifecycle Transitions ───────────────────────────────────────

export const createTransitionBody = z.object({
  status: actionStatusEnum,
  note: z.string().max(5000).optional(),
});

export const createCancelBody = z.object({
  reason: z.string().min(1).max(5000),
});

export const createReopenBody = z.object({
  reason: z.string().max(5000).optional(),
});

export const verifyBody = z.object({
  note: z.string().max(5000).optional(),
});

export const closeBody = z.object({
  note: z.string().max(5000).optional(),
});

export const escalateBody = z.object({
  reason: z.string().max(5000).optional(),
});

export const completeBody = z.object({
  note: z.string().max(5000).optional(),
});

// ── Blockers & Dependencies ─────────────────────────────────────

export const createBlockersBody = z.object({
  description: z.string().min(1).max(5000),
});

export const createResolveBody = z.object({
  resolution: z.string().max(5000).optional(),
});

export const createDependenciesBody = z.object({
  dependsOnId: z.string().uuid(),
  dependencyType: z.enum(['blocks', 'relates_to', 'duplicates', 'depends_on']),
});

// ── Evidence ────────────────────────────────────────────────────

export const createEvidenceBody = z.object({
  description: z.string().min(1).max(5000),
  fileReference: z.string().max(2048).optional(),
});

// ── Bulk ────────────────────────────────────────────────────────

export const bulkTransitionBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  status: actionStatusEnum,
});

// ── Assignment ──────────────────────────────────────────────────

export const assignBody = z.object({
  assigneeId: z.string().uuid(),
});

export const reassignBody = z.object({
  assigneeId: z.string().uuid(),
  reason: z.string().min(1).max(5000),
});

// ── Due Dates ───────────────────────────────────────────────────

export const setDueDateBody = z.object({
  dueDate: z.string().datetime({ offset: true }),
});

export const extendDeadlineBody = z.object({
  newDueDate: z.string().datetime({ offset: true }),
  reason: z.string().min(1).max(5000),
});

// ── Query / List ────────────────────────────────────────────────

export const listActionsQuery = paginationQuery.merge(statusFilter).extend({
  owner: z.string().optional(),
  status: z.string().optional(),
  source_type: z.string().optional(),
});

// ── Close / Reassign / Link (legacy-compatible) ─────────────────

export const closeActionBody = z.object({
  resolution: z.string().max(5000).optional(),
  evidence_id: z.string().uuid().optional(),
  effectiveness: z.enum(['effective', 'partially_effective', 'ineffective']).optional(),
});

export const reassignActionBody = z.object({
  new_owner: z.string().min(1),
  reason: z.string().max(2000).optional(),
  new_due_date: z.string().datetime({ offset: true }).optional(),
});

export const linkActionBody = z.object({
  source_type: z.enum(['risk', 'audit', 'incident', 'compliance', 'policy', 'vendor']),
  source_id: z.string().min(1),
  link_type: z.enum(['corrective', 'preventive', 'detective']).default('corrective'),
});

// ── Bulk (legacy-compatible) ────────────────────────────────────

export const bulkDeleteActionsBody = bulkIdsBody;

export const bulkUpdateActionsBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  update: updateActionBody,
});

export const addActionCommentBody = z.object({
  text: z.string().min(1).max(5000),
});

// ── Response Schemas ────────────────────────────────────────────

export const actionResponseSchema = z.object({
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

export const actionListResponseSchema = z.object({
  data: z.array(actionResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ────────────────────────────────────────

export const actionEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('action'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ────────────────────────────────────

export const actionStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ────────────────────────────────────────

export const actionImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const actionImportBatchSchema = z.object({
  rows: z.array(actionImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const actionExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ───────────────────────────────────────────────

export const actionAdminConfigSchema = z.object({
  moduleCode: z.literal('action'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ──────────────────────────────────────

export const actionBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const actionBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});

// ── Admin Operation Schemas ─────────────────────────────────────

export const updateConfigBody = z.object({
  autoArchiveEnabled: z.boolean().optional(),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).optional(),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).optional(),
  notificationsEnabled: z.boolean().optional(),
  aiAssistEnabled: z.boolean().optional(),
  workflowEnabled: z.boolean().optional(),
  maxItemsPerPage: z.number().int().min(10).max(200).optional(),
});

export const createReseedBody = z.object({
  scope: z.enum(['all', 'missing', 'defaults']).default('missing'),
  dryRun: z.boolean().default(false),
});

export const createReindexBody = z.object({
  entityTypes: z.array(z.string().min(1)).min(1).max(10).optional(),
  force: z.boolean().default(false),
});

export const createBackfillBody = z.object({
  entityTypes: z.array(z.string().min(1)).min(1).max(10).optional(),
  fromDate: z.string().datetime({ offset: true }).optional(),
  dryRun: z.boolean().default(false),
});
