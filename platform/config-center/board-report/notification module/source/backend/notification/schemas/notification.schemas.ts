/**
 * Zod validation schemas for Notification module.
 * Used with validate() middleware in notification route files.
 */

import { z } from 'zod';
import { paginationQuery, bulkIdsBody } from '../../../schemas/common.schemas';

// -- Notification type enum ---------------------------------------------------

const notificationTypeEnum = z.enum(['info', 'warning', 'error', 'success', 'task', 'reminder']);

// -- Notification CRUD --------------------------------------------------------

export const createNotificationBody = z.object({
  recipient_id: z.string().uuid(),
  notification_type: notificationTypeEnum,
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  channel: z.enum(['in_app', 'email', 'sms', 'push']).default('in_app'),
});

export const listNotificationsQuery = paginationQuery.extend({
  read: z.coerce.boolean().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
});

export const markReadBody = z.object({
  notification_ids: z.array(z.string().uuid()).min(1).max(100),
});

// -- Template CRUD ------------------------------------------------------------

export const createTemplateBody = z.object({
  template_code: z.string().min(1).max(100),
  subject_template: z.string().min(1).max(500),
  body_template: z.string().min(1),
  channel: z.enum(['in_app', 'email', 'sms', 'push']).default('email'),
  active: z.boolean().default(true),
});

export const updateTemplateBody = createTemplateBody.partial();

// -- Bulk Operations ----------------------------------------------------------

export const bulkDeleteNotificationsBody = bulkIdsBody;

export const bulkUpdateNotificationsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: z.object({
    read: z.boolean().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  }),
});


// ── Response Schemas ──────────────────────────────────────────
export const notificationResponseSchema = z.object({
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

export const notificationListResponseSchema = z.object({
  data: z.array(notificationResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const notificationEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('notification'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const notificationStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const notificationImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const notificationImportBatchSchema = z.object({
  rows: z.array(notificationImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const notificationExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const notificationAdminConfigSchema = z.object({
  moduleCode: z.literal('notification'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const notificationBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const notificationBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let updatePreferencesBody = z.object({
      email: z.unknown().optional(),
      push: z.unknown().optional(),
      in_app: z.unknown().optional(),
    });

export type UpdatePreferencesBodyInput = z.infer<typeof updatePreferencesBody>;

export let updateRootBody = z.object({
      activityType: z.string().min(1),
      inApp: z.unknown().optional(),
      email: z.unknown().optional(),
    });

export type UpdateRootBodyInput = z.infer<typeof updateRootBody>;

export let updateIdReadBody = z.object({});

export type UpdateIdReadBodyInput = z.infer<typeof updateIdReadBody>;

export let updateReadallBody = z.object({});

export type UpdateReadallBodyInput = z.infer<typeof updateReadallBody>;

export let createPushtokenBody = z.object({
      token: z.string().min(1),
      platform: z.string().min(1),
    });

export type CreatePushtokenBodyInput = z.infer<typeof createPushtokenBody>;

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

export const createAiPrioritizeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

