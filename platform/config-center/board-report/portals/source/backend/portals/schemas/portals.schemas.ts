import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createPortalBody = z.object({
  name: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  portal_type: z.enum(['vendor', 'client', 'partner', 'public', 'internal']).default('vendor'),
  theme: z.string().max(100).optional(),
  domain: z.string().max(255).optional(),
  logo_url: z.string().url().optional(),
  enabled: z.boolean().default(true),
  allowed_modules: z.array(z.string().max(100)).optional(),
  branding: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const updatePortalBody = createPortalBody.partial();

export const listPortalsQuery = paginationQuery.merge(statusFilter).extend({
  portal_type: z.string().optional(),
  enabled: z.enum(['true', 'false']).optional(),
  search: z.string().max(200).optional(),
});

export const bulkDeletePortalsBody = bulkIdsBody;

export const createPortalUserBody = z.object({
  portal_id: z.string().min(1),
  external_email: z.string().email(),
  display_name: z.string().min(1).max(255),
  role: z.enum(['viewer', 'contributor', 'admin']).default('viewer'),
  expires_at: z.string().datetime({ offset: true }).optional(),
});

export const generateTokenBody = z.object({
  portal_id: z.string().min(1),
  user_id: z.string().min(1),
  ttl_hours: z.coerce.number().int().min(1).max(720).default(24),
  scopes: z.array(z.string().max(100)).optional(),
});

export const createPortalPageBody = z.object({
  portal_id: z.string().min(1),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  content: z.string().max(50000).optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
  visible: z.boolean().default(true),
});

export const updatePortalPageBody = createPortalPageBody.partial().omit({ portal_id: true });


// ── Response Schemas ──────────────────────────────────────────
export const portalsResponseSchema = z.object({
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

export const portalsListResponseSchema = z.object({
  data: z.array(portalsResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const portalsEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('portals'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const portalsStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const portalsImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const portalsImportBatchSchema = z.object({
  rows: z.array(portalsImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const portalsExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const portalsAdminConfigSchema = z.object({
  moduleCode: z.literal('portals'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const portalsBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const portalsBulkStatusChangeSchema = z.object({
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

export const createProvisionBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createActivateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createDeactivateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateThemeBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateDomainBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTokensBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPagesBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateContentBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createPublishBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createWidgetsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const bulkActivateBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.string().min(1).max(50).optional(),
});

export const bulkDeactivateBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.string().min(1).max(50).optional(),
});

