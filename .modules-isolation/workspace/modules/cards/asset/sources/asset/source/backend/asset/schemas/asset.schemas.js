"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransferBody = exports.createRisksBody = exports.createControlsBody = exports.createEvidenceBody = exports.createVendorsBody = exports.createRecalculateBody = exports.createAssignBody = exports.createRecalculateCriticalityBody = exports.updateClassificationsBody = exports.createClassificationsBody = exports.assetBulkStatusChangeSchema = exports.assetBulkUpdateSchema = exports.assetAdminConfigSchema = exports.assetExportRequestSchema = exports.assetImportBatchSchema = exports.assetImportRowSchema = exports.assetStatusTransitionSchema = exports.assetEventPayloadSchema = exports.assetListResponseSchema = exports.assetResponseSchema = exports.listAssetQuery = exports.updateClassificationBody = exports.createClassificationBody = exports.transitionStageBody = exports.assignOwnerBody = exports.createEvidenceLinkBody = exports.createVendorLinkBody = exports.createDependencyBody = exports.listBusinessServicesQuery = exports.updateBusinessServiceBody = exports.createBusinessServiceBody = exports.listApplicationsQuery = exports.updateApplicationBody = exports.createApplicationBody = exports.bulkUpdateAssetsBody = exports.bulkDeleteAssetsBody = exports.listAssetsQuery = exports.updateAssetBody = exports.createAssetBody = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("../../../schemas/common.schemas");
exports.createAssetBody = zod_1.z.object({
    name: zod_1.z.string().min(3).max(255),
    type: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().optional(),
    owner: zod_1.z.string().optional(),
    criticality: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
    status: zod_1.z.enum(['discovered', 'classified', 'managed', 'review_due', 'decommissioning', 'decommissioned']).default('discovered'),
    classification: zod_1.z.string().max(100).optional(),
    control_ids: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    asset_category: zod_1.z.string().max(50).optional(),
    parent_asset_id: zod_1.z.string().uuid().optional(),
    business_service_id: zod_1.z.string().uuid().optional(),
    data_classification_id: zod_1.z.string().uuid().optional(),
    acquisition_date: zod_1.z.string().optional(),
    lifecycle_stage: zod_1.z.enum(['planning', 'procurement', 'deployment', 'operation', 'maintenance', 'decommission', 'disposed']).optional(),
    valuation_amount: zod_1.z.number().optional(),
    valuation_currency: zod_1.z.string().max(3).optional(),
    cmdb_external_id: zod_1.z.string().max(255).optional(),
    external_exposure: zod_1.z.boolean().optional(),
});
exports.updateAssetBody = exports.createAssetBody.partial();
exports.listAssetsQuery = common_schemas_1.paginationQuery.merge(common_schemas_1.statusFilter).extend({
    type: zod_1.z.string().optional(),
    owner: zod_1.z.string().optional(),
    criticality: zod_1.z.string().optional(),
    lifecycle_stage: zod_1.z.string().optional(),
    asset_category: zod_1.z.string().optional(),
    classification: zod_1.z.string().optional(),
});
exports.bulkDeleteAssetsBody = common_schemas_1.bulkIdsBody;
exports.bulkUpdateAssetsBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    update: exports.updateAssetBody,
});
exports.createApplicationBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    app_type: zod_1.z.enum(['web', 'mobile', 'desktop', 'api', 'microservice', 'database', 'middleware', 'other']).default('web'),
    vendor: zod_1.z.string().max(255).optional(),
    version: zod_1.z.string().max(50).optional(),
    environment: zod_1.z.enum(['production', 'staging', 'development', 'dr']).default('production'),
    business_owner: zod_1.z.string().optional(),
    technical_owner: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    criticality: zod_1.z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    status: zod_1.z.enum(['active', 'inactive', 'deprecated', 'planned']).default('active'),
    hosting_type: zod_1.z.enum(['on-premise', 'cloud', 'hybrid', 'saas']).default('on-premise'),
    hosting_provider: zod_1.z.string().optional(),
    url: zod_1.z.string().max(500).optional(),
    data_classification: zod_1.z.string().optional(),
    license_type: zod_1.z.string().optional(),
    license_expiry: zod_1.z.string().optional(),
    linked_asset_ids: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateApplicationBody = exports.createApplicationBody.partial();
exports.listApplicationsQuery = common_schemas_1.paginationQuery.merge(common_schemas_1.statusFilter).extend({
    app_type: zod_1.z.string().optional(),
    environment: zod_1.z.string().optional(),
    criticality: zod_1.z.string().optional(),
    vendor: zod_1.z.string().optional(),
});
exports.createBusinessServiceBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    service_type: zod_1.z.enum(['core', 'supporting', 'management', 'external']).default('supporting'),
    business_owner: zod_1.z.string().optional(),
    technical_owner: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    criticality: zod_1.z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    status: zod_1.z.enum(['active', 'inactive', 'planned', 'deprecated']).default('active'),
    sla_target_uptime: zod_1.z.number().min(0).max(100).optional(),
    rto_hours: zod_1.z.number().int().min(0).optional(),
    rpo_hours: zod_1.z.number().int().min(0).optional(),
    parent_service_id: zod_1.z.string().uuid().optional(),
    linked_application_ids: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    linked_asset_ids: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateBusinessServiceBody = exports.createBusinessServiceBody.partial();
exports.listBusinessServicesQuery = common_schemas_1.paginationQuery.merge(common_schemas_1.statusFilter).extend({
    service_type: zod_1.z.string().optional(),
    criticality: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
});
exports.createDependencyBody = zod_1.z.object({
    source_type: zod_1.z.enum(['asset', 'application', 'service']),
    source_id: zod_1.z.string().uuid(),
    target_type: zod_1.z.enum(['asset', 'application', 'service']),
    target_id: zod_1.z.string().uuid(),
    dependency_type: zod_1.z.enum(['runs_on', 'connects_to', 'depends_on', 'feeds_data_to', 'authenticates_via', 'backed_by']).default('depends_on'),
    criticality: zod_1.z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    direction: zod_1.z.enum(['outbound', 'inbound', 'bidirectional']).default('outbound'),
    notes: zod_1.z.string().optional(),
});
exports.createVendorLinkBody = zod_1.z.object({
    asset_id: zod_1.z.string().uuid(),
    vendor_id: zod_1.z.string().uuid(),
    link_type: zod_1.z.enum(['supplier', 'manufacturer', 'maintainer', 'licensor']).default('supplier'),
    contract_ref: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.createEvidenceLinkBody = zod_1.z.object({
    asset_id: zod_1.z.string().uuid(),
    evidence_task_id: zod_1.z.string().uuid(),
    link_type: zod_1.z.enum(['supports', 'validates', 'documents']).default('supports'),
    notes: zod_1.z.string().optional(),
});
exports.assignOwnerBody = zod_1.z.object({
    entity_type: zod_1.z.enum(['asset', 'application', 'service']),
    entity_id: zod_1.z.string().uuid(),
    owner_type: zod_1.z.enum(['business', 'technical', 'custodian', 'steward']),
    owner_user_id: zod_1.z.string().min(1),
    notes: zod_1.z.string().optional(),
});
exports.transitionStageBody = zod_1.z.object({
    entity_type: zod_1.z.enum(['asset', 'application', 'service']),
    entity_id: zod_1.z.string().uuid(),
    to_stage: zod_1.z.enum(['planning', 'procurement', 'deployment', 'operation', 'maintenance', 'decommission', 'disposed']),
    notes: zod_1.z.string().optional(),
});
exports.createClassificationBody = zod_1.z.object({
    code: zod_1.z.string().min(1).max(50),
    name_en: zod_1.z.string().min(1).max(255),
    name_ar: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    level: zod_1.z.number().int().min(1).max(10),
    color: zod_1.z.string().max(7).optional(),
    handling_requirements: zod_1.z.string().optional(),
    retention_period_days: zod_1.z.number().int().optional(),
    requires_encryption: zod_1.z.boolean().default(false),
    requires_dlp: zod_1.z.boolean().default(false),
});
exports.updateClassificationBody = exports.createClassificationBody.partial();
exports.listAssetQuery = exports.listAssetsQuery;
// ── Response Schemas ──────────────────────────────────────────
exports.assetResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenant_id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    status: zod_1.z.string(),
    created_at: zod_1.z.string(),
    updated_at: zod_1.z.string(),
    created_by: zod_1.z.string(),
    updated_by: zod_1.z.string().optional(),
});
exports.assetListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(exports.assetResponseSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
});
// ── Event Payload Schema ─────────────────────────────────────
exports.assetEventPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    moduleCode: zod_1.z.literal('asset'),
    triggeredBy: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    correlationId: zod_1.z.string(),
    eventVersion: zod_1.z.number().int().min(1),
    previousState: zod_1.z.string().optional(),
    newState: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
// ── Status Transition Schema ─────────────────────────────────
exports.assetStatusTransitionSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    fromStatus: zod_1.z.string(),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
    comments: zod_1.z.string().max(5000).optional(),
    evidenceIds: zod_1.z.array(zod_1.z.string()).optional(),
});
// ── Import/Export Schemas ─────────────────────────────────────
exports.assetImportRowSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    external_id: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.assetImportBatchSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.assetImportRowSchema).min(1).max(5000),
    options: zod_1.z.object({
        skipDuplicates: zod_1.z.boolean().default(true),
        validateOnly: zod_1.z.boolean().default(false),
        overwriteExisting: zod_1.z.boolean().default(false),
    }).optional(),
});
exports.assetExportRequestSchema = zod_1.z.object({
    format: zod_1.z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    columns: zod_1.z.array(zod_1.z.string()).optional(),
    includeArchived: zod_1.z.boolean().default(false),
});
// ── Admin Schemas ────────────────────────────────────────────
exports.assetAdminConfigSchema = zod_1.z.object({
    moduleCode: zod_1.z.literal('asset'),
    autoArchiveEnabled: zod_1.z.boolean().default(true),
    autoArchiveAfterDays: zod_1.z.number().int().min(30).max(3650).default(365),
    defaultVisibility: zod_1.z.enum(['team', 'department', 'org', 'global']).default('org'),
    notificationsEnabled: zod_1.z.boolean().default(true),
    aiAssistEnabled: zod_1.z.boolean().default(true),
    workflowEnabled: zod_1.z.boolean().default(true),
    maxItemsPerPage: zod_1.z.number().int().min(10).max(200).default(50),
});
// ── Bulk Operation Schemas ───────────────────────────────────
exports.assetBulkUpdateSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    update: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.assetBulkStatusChangeSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
// ── Auto-generated validation schemas (enterprise hardening) ──
exports.createClassificationsBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updateClassificationsBody = exports.createClassificationsBody.partial();
exports.createRecalculateCriticalityBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createAssignBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createRecalculateBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createVendorsBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createEvidenceBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createControlsBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createRisksBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createTransferBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
//# sourceMappingURL=asset.schemas.js.map