/**
 * Zod validation schemas for Analytics module.
 * Used with validate() middleware in analytics route files.
 */

import { z } from 'zod';
import { paginationQuery } from '../../../schemas/common.schemas';

// -- Dashboard & KPI Queries --------------------------------------------------

export const dashboardQuery = z.object({
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
  module_code: z.string().max(50).optional(),
  from_date: z.string().datetime({ offset: true }).optional(),
  to_date: z.string().datetime({ offset: true }).optional(),
});

export const kpiQuery = z.object({
  kpi_codes: z.array(z.string().min(1)).min(1).max(50),
  date_range: z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  }),
  granularity: z.enum(['day', 'week', 'month']).default('month'),
});

// -- Report CRUD --------------------------------------------------------------

export const createReportBody = z.object({
  title: z.string().min(1).max(255),
  type: z.enum(['executive', 'compliance', 'risk', 'audit', 'custom']),
  filters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
  description: z.string().optional(),
  scheduled: z.boolean().default(false),
});

export const updateReportBody = createReportBody.partial();

export const listReportsQuery = paginationQuery.extend({
  type: z.string().optional(),
});

// -- Export -------------------------------------------------------------------

export const exportQuery = z.object({
  format: z.enum(['pdf', 'csv', 'xlsx', 'json']),
  date_range: z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
  }),
  module_code: z.string().optional(),
  include_charts: z.boolean().default(false),
});


// ── Response Schemas ──────────────────────────────────────────
export const analyticsResponseSchema = z.object({
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

export const analyticsListResponseSchema = z.object({
  data: z.array(analyticsResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const analyticsEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('analytics'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const analyticsStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const analyticsImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const analyticsImportBatchSchema = z.object({
  rows: z.array(analyticsImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const analyticsExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const analyticsAdminConfigSchema = z.object({
  moduleCode: z.literal('analytics'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const analyticsBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const analyticsBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let updateDashboardconfigBody = z.object({});

export type UpdateDashboardconfigBodyInput = z.infer<typeof updateDashboardconfigBody>;

export let createBenchmarkBody = z.object({});

export type CreateBenchmarkBodyInput = z.infer<typeof createBenchmarkBody>;

export let createMaturityAssessBody = z.object({
      complianceScore: z.unknown().optional(),
      riskScore: z.unknown().optional(),
      evidenceCoverage: z.unknown().optional(),
      processMaturity: z.unknown().optional(),
    });

export type CreateMaturityAssessBodyInput = z.infer<typeof createMaturityAssessBody>;

export let createWidgetsBatchBody = z.object({
      widgetIds: z.unknown().optional(),
    });

export type CreateWidgetsBatchBodyInput = z.infer<typeof createWidgetsBatchBody>;

export let createKeyItemsBody = z.object({});

export type CreateKeyItemsBodyInput = z.infer<typeof createKeyItemsBody>;

export let updateKeyItemsitemIdBody = z.object({});

export type UpdateKeyItemsitemIdBodyInput = z.infer<typeof updateKeyItemsitemIdBody>;

export let updateKeyItemsitemIdStatusBody = z.object({
      status: z.unknown().optional(),
    });

export type UpdateKeyItemsitemIdStatusBodyInput = z.infer<typeof updateKeyItemsitemIdStatusBody>;

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

