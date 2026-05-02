/**
 * Zod validation schemas for Incident module.
 * Used with validate() middleware in incident route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createIncidentBody = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['open', 'investigating', 'contained', 'resolved', 'closed']).default('open'),
  category: z.string().max(100).optional(),
  owner: z.string().optional(),
  reported_at: z.string().datetime({ offset: true }).optional(),
  closed_at: z.string().datetime({ offset: true }).optional(),
  root_cause: z.string().optional(),
  control_ids: z.array(z.string().uuid()).optional(),
});

export const updateIncidentBody = createIncidentBody.partial();

export const listIncidentsQuery = paginationQuery.merge(statusFilter).extend({
  severity: z.string().optional(),
  owner: z.string().optional(),
  category: z.string().optional(),
});

export const bulkDeleteIncidentsBody = bulkIdsBody;
export const bulkUpdateIncidentsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateIncidentBody,
});

// ── Legacy schemas (migrated from flat) ──

export const reportIncidentBody = z.object({
  title: z.string().min(1).max(255),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.string().min(1),
  description: z.string().optional(),
  reported_by: z.string().optional(),
  owner: z.string().optional(),
  affected_assets: z.array(z.string().uuid()).optional(),
});

export const investigateBody = z.object({
  findings: z.string().min(1),
  root_cause: z.string().optional(),
  impact_assessment: z.string().optional(),
  investigator: z.string().optional(),
});

export const lessonsLearnedBody = z.object({
  incident_id: z.string().uuid(),
  lessons: z.string().min(1),
  preventive_actions: z.array(z.string()).optional(),
  reviewer: z.string().optional(),
});

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement inline validation in routes Use listIncidentsQuery */
export const listIncidentQuery = listIncidentsQuery;


// ── Response Schemas ──────────────────────────────────────────
export const incidentResponseSchema = z.object({
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

export const incidentListResponseSchema = z.object({
  data: z.array(incidentResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const incidentEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('incident'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const incidentStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const incidentImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const incidentImportBatchSchema = z.object({
  rows: z.array(incidentImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const incidentExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const incidentAdminConfigSchema = z.object({
  moduleCode: z.literal('incident'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const incidentBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const incidentBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createTaxonomyBody = z.object({});

export type CreateTaxonomyBodyInput = z.infer<typeof createTaxonomyBody>;

export let updateTaxonomynodeIdBody = z.object({});

export type UpdateTaxonomynodeIdBodyInput = z.infer<typeof updateTaxonomynodeIdBody>;

export let createNearmissBody = z.object({});

export type CreateNearmissBodyInput = z.infer<typeof createNearmissBody>;

export let createNearmissidConvertBody = z.object({});

export type CreateNearmissidConvertBodyInput = z.infer<typeof createNearmissidConvertBody>;

export let createPirBody = z.object({});

export type CreatePirBodyInput = z.infer<typeof createPirBody>;

export let updatePirpirIdBody = z.object({});

export type UpdatePirpirIdBodyInput = z.infer<typeof updatePirpirIdBody>;

export let createPirpirIdSignoffBody = z.object({
      decision: z.unknown().optional(),
      comments: z.unknown().optional(),
    });

export type CreatePirpirIdSignoffBodyInput = z.infer<typeof createPirpirIdSignoffBody>;

export let createRegulatorynotificationBody = z.object({
      incident_id: z.unknown().optional(),
    });

export type CreateRegulatorynotificationBodyInput = z.infer<typeof createRegulatorynotificationBody>;

export let createRegulatorynotificationIdSubmitBody = z.object({
      reference_number: z.unknown().optional(),
    });

export type CreateRegulatorynotificationIdSubmitBodyInput = z.infer<typeof createRegulatorynotificationIdSubmitBody>;

export let createRisklinkBody = z.object({
      incident_id: z.unknown().optional(),
      risk_id: z.unknown().optional(),
    });

export type CreateRisklinkBodyInput = z.infer<typeof createRisklinkBody>;

export let createRiskautoupdateincidentIdBody = z.object({});

export type CreateRiskautoupdateincidentIdBodyInput = z.infer<typeof createRiskautoupdateincidentIdBody>;

export let createActionBody = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      action_type: z.string().optional(),
      assigned_to: z.string().optional(),
      due_date: z.string().optional(),
      priority: z.string().optional(),
    });

export type CreateActionBodyInput = z.infer<typeof createActionBody>;

export let updateActionBody = z.object({
      status: z.string().optional(),
      outcome: z.string().optional(),
    });

export type UpdateActionBodyInput = z.infer<typeof updateActionBody>;

export let createRootCauseBody = z.object({
      category: z.string().min(1),
      description: z.string().min(1),
      contributing_factors: z.string().optional(),
      corrective_action: z.string().optional(),
      preventive_action: z.string().optional(),
      control_id: z.string().optional(),
    });

export type CreateRootCauseBodyInput = z.infer<typeof createRootCauseBody>;

export let updateStatusBody = z.object({
      status: z.string().min(1),
    });

export type UpdateStatusBodyInput = z.infer<typeof updateStatusBody>;

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

