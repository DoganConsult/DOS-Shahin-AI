/**
 * Zod validation schemas for Integrations module.
 * Used with validate() middleware in integrations route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

// -- Connector CRUD -----------------------------------------------------------

export const createConnectorBody = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(100),
  config_json: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  status: z.enum(['configured', 'testing', 'active', 'failed', 'paused', 'decommissioned', 'error', 'pending', 'inactive']).default('configured'),
  description: z.string().optional(),
  endpoint_url: z.string().url().optional(),
});

export const updateConnectorBody = createConnectorBody.partial();

export const listConnectorsQuery = paginationQuery.merge(statusFilter).extend({
  type: z.string().optional(),
});

// -- Connector Actions --------------------------------------------------------

export const testConnectorBody = z.object({
  connector_id: z.string().uuid(),
});

export const syncConnectorBody = z.object({
  connector_id: z.string().uuid(),
  full_sync: z.boolean().default(false),
});

// -- Bulk Operations ----------------------------------------------------------

export const bulkDeleteConnectorsBody = bulkIdsBody;

export const bulkUpdateConnectorsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateConnectorBody,
});


// ── Response Schemas ──────────────────────────────────────────
export const integrationsResponseSchema = z.object({
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

export const integrationsListResponseSchema = z.object({
  data: z.array(integrationsResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const integrationsEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('integrations'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const integrationsStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const integrationsImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const integrationsImportBatchSchema = z.object({
  rows: z.array(integrationsImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const integrationsExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const integrationsAdminConfigSchema = z.object({
  moduleCode: z.literal('integrations'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const integrationsBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const integrationsBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createIdPingBody = z.object({});

export type CreateIdPingBodyInput = z.infer<typeof createIdPingBody>;

export let createRootBody = z.object({});

export type CreateRootBodyInput = z.infer<typeof createRootBody>;

export let createIdRunBody = z.object({});

export type CreateIdRunBodyInput = z.infer<typeof createIdRunBody>;

export let createTestBody = z.object({
      sourceSystemType: z.string().min(1),
      credentials: z.unknown().optional(),
      platform: z.unknown().optional(),
    });

export type CreateTestBodyInput = z.infer<typeof createTestBody>;

export let createTestallBody = z.object({});

export type CreateTestallBodyInput = z.infer<typeof createTestallBody>;

export let createIdTransitionBody = z.object({
      status: z.unknown().optional(),
      reason: z.unknown().optional(),
    });

export type CreateIdTransitionBodyInput = z.infer<typeof createIdTransitionBody>;

export let updateIdOwnershipBody = z.object({
      ownerId: z.unknown().optional(),
      ownerTeamId: z.unknown().optional(),
    });

export type UpdateIdOwnershipBodyInput = z.infer<typeof updateIdOwnershipBody>;

export let createWebhooksBody = z.object({
      url: z.string().min(1),
    });

export type CreateWebhooksBodyInput = z.infer<typeof createWebhooksBody>;

export let createWebhooksDispatchBody = z.object({
      eventType: z.string().min(1),
      payload: z.unknown().optional(),
    });

export type CreateWebhooksDispatchBodyInput = z.infer<typeof createWebhooksDispatchBody>;

export let createJiraIssuesBody = z.object({
      title: z.string().min(1),
      description: z.unknown().optional(),
      priority: z.unknown().optional(),
      assignee: z.unknown().optional(),
    });

export type CreateJiraIssuesBodyInput = z.infer<typeof createJiraIssuesBody>;

export let createSlackMessagesBody = z.object({
      channel: z.string().min(1),
      text: z.unknown().optional(),
      blocks: z.unknown().optional(),
    });

export type CreateSlackMessagesBodyInput = z.infer<typeof createSlackMessagesBody>;

export let createConfigsBody = z.object({
      type: z.string().min(1),
      config: z.unknown().optional(),
      enabled: z.unknown().optional(),
    });

export type CreateConfigsBodyInput = z.infer<typeof createConfigsBody>;

export let updateConfigsidBody = z.object({
      type: z.unknown().optional(),
      config: z.unknown().optional(),
      enabled: z.unknown().optional(),
    });

export type UpdateConfigsidBodyInput = z.infer<typeof updateConfigsidBody>;

export let createOpenclawToolstoolNameExecuteBody = z.object({});

export type CreateOpenclawToolstoolNameExecuteBodyInput = z.infer<typeof createOpenclawToolstoolNameExecuteBody>;

export let createOpenclawTestBody = z.object({});

export type CreateOpenclawTestBodyInput = z.infer<typeof createOpenclawTestBody>;

export let createWebhookBody = z.object({
      url: z.string().url().min(1),
      event_types: z.array(z.string().min(1)).min(1),
      secret: z.string().optional(),
    });

export type CreateWebhookBodyInput = z.infer<typeof createWebhookBody>;

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

export const createTestBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

