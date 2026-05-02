import { z } from 'zod';
import { paginationQuery, statusFilter, bulkIdsBody } from '../../../schemas/common.schemas';

export const createAssetBody = z.object({
  name: z.string().min(3).max(255),
  type: z.string().min(1).max(100),
  description: z.string().optional(),
  owner: z.string().optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['discovered', 'classified', 'managed', 'review_due', 'decommissioning', 'decommissioned']).default('discovered'),
  classification: z.string().max(100).optional(),
  control_ids: z.array(z.string().uuid()).optional(),
  asset_category: z.string().max(50).optional(),
  parent_asset_id: z.string().uuid().optional(),
  business_service_id: z.string().uuid().optional(),
  data_classification_id: z.string().uuid().optional(),
  acquisition_date: z.string().optional(),
  lifecycle_stage: z.enum(['planning', 'procurement', 'deployment', 'operation', 'maintenance', 'decommission', 'disposed']).optional(),
  valuation_amount: z.number().optional(),
  valuation_currency: z.string().max(3).optional(),
  cmdb_external_id: z.string().max(255).optional(),
  external_exposure: z.boolean().optional(),
});

export const updateAssetBody = createAssetBody.partial();

export const listAssetsQuery = paginationQuery.merge(statusFilter).extend({
  type: z.string().optional(),
  owner: z.string().optional(),
  criticality: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  asset_category: z.string().optional(),
  classification: z.string().optional(),
});

export const bulkDeleteAssetsBody = bulkIdsBody;
export const bulkUpdateAssetsBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  update: updateAssetBody,
});

export const createApplicationBody = z.object({
  name: z.string().min(1).max(255),
  app_type: z.enum(['web', 'mobile', 'desktop', 'api', 'microservice', 'database', 'middleware', 'other']).default('web'),
  vendor: z.string().max(255).optional(),
  version: z.string().max(50).optional(),
  environment: z.enum(['production', 'staging', 'development', 'dr']).default('production'),
  business_owner: z.string().optional(),
  technical_owner: z.string().optional(),
  department: z.string().optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['active', 'inactive', 'deprecated', 'planned']).default('active'),
  hosting_type: z.enum(['on-premise', 'cloud', 'hybrid', 'saas']).default('on-premise'),
  hosting_provider: z.string().optional(),
  url: z.string().max(500).optional(),
  data_classification: z.string().optional(),
  license_type: z.string().optional(),
  license_expiry: z.string().optional(),
  linked_asset_ids: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateApplicationBody = createApplicationBody.partial();

export const listApplicationsQuery = paginationQuery.merge(statusFilter).extend({
  app_type: z.string().optional(),
  environment: z.string().optional(),
  criticality: z.string().optional(),
  vendor: z.string().optional(),
});

export const createBusinessServiceBody = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  service_type: z.enum(['core', 'supporting', 'management', 'external']).default('supporting'),
  business_owner: z.string().optional(),
  technical_owner: z.string().optional(),
  department: z.string().optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  status: z.enum(['active', 'inactive', 'planned', 'deprecated']).default('active'),
  sla_target_uptime: z.number().min(0).max(100).optional(),
  rto_hours: z.number().int().min(0).optional(),
  rpo_hours: z.number().int().min(0).optional(),
  parent_service_id: z.string().uuid().optional(),
  linked_application_ids: z.array(z.string().uuid()).optional(),
  linked_asset_ids: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateBusinessServiceBody = createBusinessServiceBody.partial();

export const listBusinessServicesQuery = paginationQuery.merge(statusFilter).extend({
  service_type: z.string().optional(),
  criticality: z.string().optional(),
  department: z.string().optional(),
});

export const createDependencyBody = z.object({
  source_type: z.enum(['asset', 'application', 'service']),
  source_id: z.string().uuid(),
  target_type: z.enum(['asset', 'application', 'service']),
  target_id: z.string().uuid(),
  dependency_type: z.enum(['runs_on', 'connects_to', 'depends_on', 'feeds_data_to', 'authenticates_via', 'backed_by']).default('depends_on'),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
  direction: z.enum(['outbound', 'inbound', 'bidirectional']).default('outbound'),
  notes: z.string().optional(),
});

export const createVendorLinkBody = z.object({
  asset_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  link_type: z.enum(['supplier', 'manufacturer', 'maintainer', 'licensor']).default('supplier'),
  contract_ref: z.string().optional(),
  notes: z.string().optional(),
});

export const createEvidenceLinkBody = z.object({
  asset_id: z.string().uuid(),
  evidence_task_id: z.string().uuid(),
  link_type: z.enum(['supports', 'validates', 'documents']).default('supports'),
  notes: z.string().optional(),
});

export const assignOwnerBody = z.object({
  entity_type: z.enum(['asset', 'application', 'service']),
  entity_id: z.string().uuid(),
  owner_type: z.enum(['business', 'technical', 'custodian', 'steward']),
  owner_user_id: z.string().min(1),
  notes: z.string().optional(),
});

export const transitionStageBody = z.object({
  entity_type: z.enum(['asset', 'application', 'service']),
  entity_id: z.string().uuid(),
  to_stage: z.enum(['planning', 'procurement', 'deployment', 'operation', 'maintenance', 'decommission', 'disposed']),
  notes: z.string().optional(),
});

export const createClassificationBody = z.object({
  code: z.string().min(1).max(50),
  name_en: z.string().min(1).max(255),
  name_ar: z.string().optional(),
  description: z.string().optional(),
  level: z.number().int().min(1).max(10),
  color: z.string().max(7).optional(),
  handling_requirements: z.string().optional(),
  retention_period_days: z.number().int().optional(),
  requires_encryption: z.boolean().default(false),
  requires_dlp: z.boolean().default(false),
});

export const updateClassificationBody = createClassificationBody.partial();

export const listAssetQuery = listAssetsQuery;


// ── Response Schemas ──────────────────────────────────────────
export const assetResponseSchema = z.object({
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

export const assetListResponseSchema = z.object({
  data: z.array(assetResponseSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});

// ── Event Payload Schema ─────────────────────────────────────
export const assetEventPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  moduleCode: z.literal('asset'),
  triggeredBy: z.string(),
  timestamp: z.string(),
  correlationId: z.string(),
  eventVersion: z.number().int().min(1),
  previousState: z.string().optional(),
  newState: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
});

// ── Status Transition Schema ─────────────────────────────────
export const assetStatusTransitionSchema = z.object({
  entityId: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(),
  comments: z.string().max(5000).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

// ── Import/Export Schemas ─────────────────────────────────────
export const assetImportRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  external_id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const assetImportBatchSchema = z.object({
  rows: z.array(assetImportRowSchema).min(1).max(5000),
  options: z.object({
    skipDuplicates: z.boolean().default(true),
    validateOnly: z.boolean().default(false),
    overwriteExisting: z.boolean().default(false),
  }).optional(),
});

export const assetExportRequestSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
  filters: z.record(z.string(), z.string()).optional(),
  columns: z.array(z.string()).optional(),
  includeArchived: z.boolean().default(false),
});

// ── Admin Schemas ────────────────────────────────────────────
export const assetAdminConfigSchema = z.object({
  moduleCode: z.literal('asset'),
  autoArchiveEnabled: z.boolean().default(true),
  autoArchiveAfterDays: z.number().int().min(30).max(3650).default(365),
  defaultVisibility: z.enum(['team', 'department', 'org', 'global']).default('org'),
  notificationsEnabled: z.boolean().default(true),
  aiAssistEnabled: z.boolean().default(true),
  workflowEnabled: z.boolean().default(true),
  maxItemsPerPage: z.number().int().min(10).max(200).default(50),
});

// ── Bulk Operation Schemas ───────────────────────────────────
export const assetBulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  update: z.record(z.string(), z.unknown()),
});

export const assetBulkStatusChangeSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  toStatus: z.string(),
  reason: z.string().optional(),
});

// ── Auto-generated validation schemas (enterprise hardening) ──

export const createClassificationsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateClassificationsBody = createClassificationsBody.partial();

export const createRecalculateCriticalityBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createAssignBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRecalculateBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createVendorsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createEvidenceBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createControlsBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createRisksBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const createTransferBody = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

