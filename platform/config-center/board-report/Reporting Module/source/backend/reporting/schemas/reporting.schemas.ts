/**
 * Zod validation schemas for Reporting module.
 * Used with validate() middleware in reporting route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter as _statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createReportScheduleBody = z.object({
  template_id: z.string().min(1),
  name: z.string().min(3).max(255),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'annual']),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(['pdf', 'xlsx', 'csv']).default('pdf'),
  next_run_at: z.string().datetime({ offset: true }).optional(),
});

export const updateReportScheduleBody = createReportScheduleBody.partial();

export const listReportSchedulesQuery = paginationQuery.extend({
  template_id: z.string().optional(),
  frequency: z.string().optional(),
});

export const generateReportBody = z.object({
  template_id: z.string().min(1),
  format: z.enum(['pdf', 'xlsx', 'csv']).default('pdf'),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

export const bulkDeleteReportSchedulesBody = bulkIdsBody;

export const createReportTemplateBody = z.object({
  name: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  template_type: z.enum(['board_pack', 'executive_summary', 'compliance', 'risk', 'audit', 'custom']),
  sections: z.array(z.object({
    title: z.string().min(1).max(255),
    module_code: z.string().max(50).optional(),
    chart_type: z.enum(['table', 'bar', 'line', 'pie', 'heatmap', 'text']).optional(),
    data_query: z.string().max(500).optional(),
  })).min(1),
});

export const shareReportBody = z.object({
  report_id: z.string().min(1),
  recipients: z.array(z.string().email()).min(1),
  message: z.string().max(2000).optional(),
  include_attachments: z.boolean().default(true),
});


// ── Response Schemas ──────────────────────────────────────────
export const reportingResponseSchema = z.object({
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

export const reportingListResponseSchema = z.object({
  data: z.array(reportingResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const reportingEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('reporting'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const reportingStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const reportingImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const reportingImportBatchSchema = z.object({
  rows: z.array(reportingImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const reportingExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const reportingAdminConfigSchema = z.object({
  moduleCode: z.literal('reporting'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const reportingBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const reportingBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createGenerateBody = z.object({
      templateCode: z.string().min(1),
      period: z.unknown().optional(),
    });

export type CreateGenerateBodyInput = z.infer<typeof createGenerateBody>;

export let createGeneratepptxBody = z.object({
      templateCode: z.string().min(1),
      period: z.unknown().optional(),
    });

export type CreateGeneratepptxBodyInput = z.infer<typeof createGeneratepptxBody>;

export let createSchedulesBody = z.object({
      templateKey: z.string().min(1),
      cronExpression: z.unknown().optional(),
      parameters: z.unknown().optional(),
    });

export type CreateSchedulesBodyInput = z.infer<typeof createSchedulesBody>;

export let updateSchedulesidToggleBody = z.object({});

export type UpdateSchedulesidToggleBodyInput = z.infer<typeof updateSchedulesidToggleBody>;

export let createScheduleBody = z.object({
      templateId: z.string().min(1),
      cronExpression: z.unknown().optional(),
      recipients: z.unknown().optional(),
      filters: z.unknown().optional(),
    });

export type CreateScheduleBodyInput = z.infer<typeof createScheduleBody>;

export let createEvidencepackexportBody = z.object({
      frameworkId: z.string().min(1),
      controlIds: z.unknown().optional(),
    });

export type CreateEvidencepackexportBodyInput = z.infer<typeof createEvidencepackexportBody>;

export let createKeyGenerateBody = z.object({});

export type CreateKeyGenerateBodyInput = z.infer<typeof createKeyGenerateBody>;

export let createReportIdEmailBody = z.object({
      to: z.string().min(1),
      subject: z.unknown().optional(),
      message: z.unknown().optional(),
      attachPdf: z.unknown().optional(),
    });

export type CreateReportIdEmailBodyInput = z.infer<typeof createReportIdEmailBody>;

export let createReportIdShareBody = z.object({
      recipientIds: z.string().min(1),
      recipientType: z.unknown().optional(),
    });

export type CreateReportIdShareBodyInput = z.infer<typeof createReportIdShareBody>;

export let createTypeGenerateBody = z.object({});

export type CreateTypeGenerateBodyInput = z.infer<typeof createTypeGenerateBody>;

export let createStreamStartBody = z.object({
      reportId: z.string().min(1),
      reportType: z.unknown().optional(),
      filters: z.unknown().optional(),
      refreshInterval: z.unknown().optional(),
    });

export type CreateStreamStartBodyInput = z.infer<typeof createStreamStartBody>;

export let createStreamStopreportIdBody = z.object({});

export type CreateStreamStopreportIdBodyInput = z.infer<typeof createStreamStopreportIdBody>;

export let createStreamRefreshreportIdBody = z.object({});

export type CreateStreamRefreshreportIdBodyInput = z.infer<typeof createStreamRefreshreportIdBody>;

export let createNaturalGenerateBody = z.object({
      query: z.string().min(1),
      language: z.unknown().optional(),
      context: z.unknown().optional(),
    });

export type CreateNaturalGenerateBodyInput = z.infer<typeof createNaturalGenerateBody>;

export let createComplianceframeworkIdBody = z.object({});

export type CreateComplianceframeworkIdBodyInput = z.infer<typeof createComplianceframeworkIdBody>;

export let createRegulatorysubmissionsGenerateBody = z.object({
      regulatorCode: z.string().min(1),
      frameworkCode: z.unknown().optional(),
      submissionType: z.unknown().optional(),
      periodStart: z.unknown().optional(),
      periodEnd: z.unknown().optional(),
      language: z.unknown().optional(),
    });

export type CreateRegulatorysubmissionsGenerateBodyInput = z.infer<typeof createRegulatorysubmissionsGenerateBody>;

export let createRegulatorysubmissionssubmissionIdExportpdfBody = z.object({});

export type CreateRegulatorysubmissionssubmissionIdExportpdfBodyInput = z.infer<typeof createRegulatorysubmissionssubmissionIdExportpdfBody>;

export let updateRegulatorysubmissionssubmissionIdStatusBody = z.object({
      status: z.string().min(1),
      reviewNotes: z.unknown().optional(),
    });

export type UpdateRegulatorysubmissionssubmissionIdStatusBodyInput = z.infer<typeof updateRegulatorysubmissionssubmissionIdStatusBody>;

export let updateRegulatorysubmissionssubmissionIdBody = z.object({});

export type UpdateRegulatorysubmissionssubmissionIdBodyInput = z.infer<typeof updateRegulatorysubmissionssubmissionIdBody>;

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

