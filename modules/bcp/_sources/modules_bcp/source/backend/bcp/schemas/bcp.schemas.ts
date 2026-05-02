/**
 * Zod validation schemas for BCP (Business Continuity Planning) module.
 * Used with validate() middleware in bcp route files.
 */

import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createBcpPlanBody = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  owner: z.string().optional(),
  rto_hours: z.coerce.number().min(0).optional(),
  rpo_hours: z.coerce.number().min(0).optional(),
  last_tested_at: z.string().datetime({ offset: true }).optional(),
});

export const updateBcpPlanBody = createBcpPlanBody.partial();

export const listBcpPlansQuery = paginationQuery.merge(statusFilter).extend({
  owner: z.string().optional(),
});

export const createBcpTestBody = z.object({
  plan_id: z.string().uuid(),
  test_type: z.enum(['tabletop', 'simulation', 'full']),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  notes: z.string().optional(),
});

export const updateBcpTestBody = createBcpTestBody.partial();

export const bulkDeleteBcpPlansBody = bulkIdsBody;

// ── Bulk Operations ─────────────────────────────────────────────

export const bulkUpdateBcpPlansBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateBcpPlanBody,
});

// ── Legacy schemas (migrated from flat) ──

export const createBCPBody = z.object({
  plan_name: z.string().min(1).max(255),
  description: z.string().optional(),
  rto: z.coerce.number().min(0).optional(),
  rpo: z.coerce.number().min(0).optional(),
  recovery_team: z.string().optional(),
  critical_processes: z.array(z.string()).optional(),
});

export const updateBCPBody = createBCPBody.partial();

export const scheduleDRTestBody = z.object({
  plan_id: z.string().uuid(),
  test_date: z.string().datetime({ offset: true }),
  test_type: z.enum(['tabletop', 'simulation', 'full']).default('tabletop'),
  participants: z.array(z.string()).optional(),
  objectives: z.string().optional(),
});

export const documentRecoveryBody = z.object({
  plan_id: z.string().uuid(),
  incident_id: z.string().uuid().optional(),
  outcome: z.string().min(1),
  lessons_learned: z.string().optional(),
  actual_rto: z.coerce.number().min(0).optional(),
});

/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement inline validation in routes Use listBcpPlansQuery */
export const listBCPQuery = listBcpPlansQuery;


// ── Response Schemas ──────────────────────────────────────────
export const bcpResponseSchema = z.object({
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

export const bcpListResponseSchema = z.object({
  data: z.array(bcpResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const bcpEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('bcp'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const bcpStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const bcpImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const bcpImportBatchSchema = z.object({
  rows: z.array(bcpImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const bcpExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const bcpAdminConfigSchema = z.object({
  moduleCode: z.literal('bcp'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const bcpBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const bcpBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});
export let createBiaBody = z.object({
      assessor_id: z.unknown().optional(),
    });

export type CreateBiaBodyInput = z.infer<typeof createBiaBody>;

export let createBiabiaIdCalculateBody = z.object({});

export type CreateBiabiaIdCalculateBodyInput = z.infer<typeof createBiabiaIdCalculateBody>;

export let createExercisesBody = z.object({});

export type CreateExercisesBodyInput = z.infer<typeof createExercisesBody>;

export let createExercisesexerciseIdResultsBody = z.object({});

export type CreateExercisesexerciseIdResultsBodyInput = z.infer<typeof createExercisesexerciseIdResultsBody>;

export let createCrisiscommBody = z.object({});

export type CreateCrisiscommBodyInput = z.infer<typeof createCrisiscommBody>;

export let createCrisiscommplanIdActivateBody = z.object({
      incident_id: z.unknown().optional(),
    });

export type CreateCrisiscommplanIdActivateBodyInput = z.infer<typeof createCrisiscommplanIdActivateBody>;

export let createRecoverystrategiesBody = z.object({});

export type CreateRecoverystrategiesBodyInput = z.infer<typeof createRecoverystrategiesBody>;

export let createRecoverystrategiesstrategyIdLinkbiaBody = z.object({
      bia_id: z.unknown().optional(),
    });

export type CreateRecoverystrategiesstrategyIdLinkbiaBodyInput = z.infer<typeof createRecoverystrategiesstrategyIdLinkbiaBody>;

export let createActivateBody = z.object({
      plan_id: z.unknown().optional(),
      reason: z.unknown().optional(),
      incident_id: z.unknown().optional(),
    });

export type CreateActivateBodyInput = z.infer<typeof createActivateBody>;

export let updateRecoverystepsstepIdBody = z.object({});

export type UpdateRecoverystepsstepIdBodyInput = z.infer<typeof updateRecoverystepsstepIdBody>;

export let createDeactivateactivationIdBody = z.object({});

export type CreateDeactivateactivationIdBodyInput = z.infer<typeof createDeactivateactivationIdBody>;

export let createDependencymapsBody = z.object({});

export type CreateDependencymapsBodyInput = z.infer<typeof createDependencymapsBody>;

export let createMaturityBody = z.object({});

export type CreateMaturityBodyInput = z.infer<typeof createMaturityBody>;

export let createBusinesschangeimpactBody = z.object({
      changeType: z.string().min(1),
      entityType: z.unknown().optional(),
      entityId: z.unknown().optional(),
      entityName: z.unknown().optional(),
      details: z.unknown().optional(),
    });

export type CreateBusinesschangeimpactBodyInput = z.infer<typeof createBusinesschangeimpactBody>;

export let declareCrisisBody = z.object({
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      crisis_type: z.string().optional(),
      severity: z.string().optional(),
    });

export type DeclareCrisisBodyInput = z.infer<typeof declareCrisisBody>;

export let updateStatusBody = z.object({
      status: z.string().min(1),
      message: z.string().optional(),
    });

export type UpdateStatusBodyInput = z.infer<typeof updateStatusBody>;

export let timelineEntryBody = z.object({
      type: z.string().min(1),
      message: z.string().min(1),
    });

export type TimelineEntryBodyInput = z.infer<typeof timelineEntryBody>;

export let resolveCrisisBody = z.object({
      post_crisis_review: z.string().optional(),
    });

export type ResolveCrisisBodyInput = z.infer<typeof resolveCrisisBody>;

export let createFindingBody = z.object({
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      source_type: z.string().optional(),
      source_id: z.string().uuid().optional(),
      finding_type: z.string().optional(),
      severity: z.string().optional(),
    });

export type CreateFindingBodyInput = z.infer<typeof createFindingBody>;

export let updateFindingBody = z.object({});

export type UpdateFindingBodyInput = z.infer<typeof updateFindingBody>;

export let createServiceBody = z.object({
      service_name: z.string().min(1).max(500),
      service_code: z.string().max(60).optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      criticality: z.string().optional(),
      service_tier: z.string().optional(),
    });

export type CreateServiceBodyInput = z.infer<typeof createServiceBody>;

export let updateServiceBody = z.object({});

export type UpdateServiceBodyInput = z.infer<typeof updateServiceBody>;

export let linkBiaBody = z.object({ bia_id: z.string().uuid() });

export type LinkBiaBodyInput = z.infer<typeof linkBiaBody>;

// ── Auto-generated validation schemas (enterprise hardening) ──

export const createVerifyBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createCloseBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

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

