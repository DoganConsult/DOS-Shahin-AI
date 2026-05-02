import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createIssueBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  category: z.enum(['finding', 'observation', 'non_conformity', 'improvement', 'deficiency']).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).default('medium'),
  source_module: z.string().max(100).optional(),
  source_id: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().datetime({ offset: true }).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const updateIssueBody = createIssueBody.partial();

export const listIssuesQuery = paginationQuery.merge(statusFilter).extend({
  category: z.string().optional(),
  severity: z.string().optional(),
  assigned_to: z.string().optional(),
  source_module: z.string().optional(),
  search: z.string().max(200).optional(),
});

export const bulkDeleteIssuesBody = bulkIdsBody;
export const bulkUpdateIssuesBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(50),
  update: updateIssueBody,
});

export const addIssueCommentBody = z.object({
  text: z.string().min(1).max(5000),
});

export const resolveIssueBody = z.object({
  resolution: z.string().min(1).max(5000),
  evidence_id: z.string().uuid().optional(),
  root_cause: z.string().max(2000).optional(),
});

export const reassignIssueBody = z.object({
  new_assignee: z.string().min(1),
  reason: z.string().max(2000).optional(),
  new_due_date: z.string().datetime({ offset: true }).optional(),
});

export const linkIssueBody = z.object({
  source_module: z.enum(['risk', 'audit', 'compliance', 'incident', 'vendor', 'policy']),
  source_id: z.string().min(1),
  link_type: z.enum(['caused_by', 'related_to', 'duplicate_of']).default('related_to'),
});


// ── Response Schemas ──────────────────────────────────────────
export const issuesResponseSchema = z.object({
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

export const issuesListResponseSchema = z.object({
  data: z.array(issuesResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const issuesEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('issues'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const issuesStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const issuesImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const issuesImportBatchSchema = z.object({
  rows: z.array(issuesImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const issuesExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const issuesAdminConfigSchema = z.object({
  moduleCode: z.literal('issues'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const issuesBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const issuesBulkStatusChangeSchema = z.object({
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

export const createSlaEscalationBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEscalationChainBody = z.object({
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

export const createResolveBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createVerifyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReopenBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReassignBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEscalateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRiskLinkBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const bulkTransitionBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.string().min(1).max(50).optional(),
});

