import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createMessageBody = z.object({
  subject: z.string().min(1).max(255),
  body: z.string().max(10000).optional(),
  channel: z.enum(['in_app', 'email', 'sms', 'push', 'webhook']).default('in_app'),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
  recipient_ids: z.array(z.string().min(1)).min(1).max(100),
  related_module: z.string().max(100).optional(),
  related_entity_id: z.string().optional(),
  action_url: z.string().url().optional(),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

export const updateMessageBody = z.object({
  read: z.boolean().optional(),
  archived: z.boolean().optional(),
  starred: z.boolean().optional(),
  status: z.enum(['unread', 'read', 'archived', 'dismissed']).optional(),
});

export const listMessagesQuery = paginationQuery.merge(statusFilter).extend({
  channel: z.string().optional(),
  priority: z.string().optional(),
  read: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
  related_module: z.string().optional(),
});

export const bulkDeleteMessagesBody = bulkIdsBody;
export const bulkUpdateMessagesBody = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  update: updateMessageBody,
});

export const markAllReadBody = z.object({
  channel: z.enum(['in_app', 'email', 'sms', 'push', 'webhook']).optional(),
  before: z.string().datetime({ offset: true }).optional(),
});

export const createTemplateBody = z.object({
  code: z.string().min(1).max(100),
  subject_template: z.string().min(1).max(500),
  body_template: z.string().min(1).max(10000),
  channel: z.enum(['in_app', 'email', 'sms', 'push']).default('in_app'),
  variables: z.array(z.string().max(100)).optional(),
});

export const sendBroadcastBody = z.object({
  subject: z.string().min(1).max(255),
  body: z.string().max(10000),
  recipient_roles: z.array(z.string().max(100)).min(1),
  channel: z.enum(['in_app', 'email', 'both']).default('both'),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).default('normal'),
});


// ── Response Schemas ──────────────────────────────────────────
export const inboxResponseSchema = z.object({
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

export const inboxListResponseSchema = z.object({
  data: z.array(inboxResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const inboxEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('inbox'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const inboxStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const inboxImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const inboxImportBatchSchema = z.object({
  rows: z.array(inboxImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const inboxExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const inboxAdminConfigSchema = z.object({
  moduleCode: z.literal('inbox'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const inboxBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const inboxBulkStatusChangeSchema = z.object({
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

export const createPurgeExpiredBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRecalcPrioritiesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEscalateOverdueBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRoutingRulesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updatePreferencesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createReadBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createUnreadBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createActionBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createStarBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createArchiveBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const bulkReadBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.string().min(1).max(50).optional(),
});

export const bulkArchiveBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.string().min(1).max(50).optional(),
});

export const bulkDeleteBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.string().min(1).max(50).optional(),
});

