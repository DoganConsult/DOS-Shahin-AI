"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkClassifyBody = exports.bulkTransitionBody = exports.bulkDisposalBody = exports.createExecuteBody = exports.createRejectBody = exports.createApproveBody = exports.createDisposalBody = exports.createTagsBody = exports.createClassifyBody = exports.createTransitionBody = exports.createRunBody = exports.createSavedSearchesBody = exports.createRulesBody = exports.createReleaseBody = exports.createLegalHoldsBody = exports.createEnforceBody = exports.createPoliciesBody = exports.createBackfillBody = exports.createReindexBody = exports.createReseedBody = exports.updateConfigBody = exports.recordsBulkStatusChangeSchema = exports.recordsBulkUpdateSchema = exports.recordsAdminConfigSchema = exports.recordsExportRequestSchema = exports.recordsImportBatchSchema = exports.recordsImportRowSchema = exports.recordsStatusTransitionSchema = exports.recordsEventPayloadSchema = exports.recordsListResponseSchema = exports.recordsResponseSchema = exports.addRecordVersionBody = exports.applyRetentionPolicyBody = exports.archiveRecordBody = exports.bulkUpdateRecordsBody = exports.bulkDeleteRecordsBody = exports.listRecordsQuery = exports.updateRecordBody = exports.createRecordBody = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("../../../schemas/common.schemas");
exports.createRecordBody = zod_1.z.object({
    title: zod_1.z.string().min(3).max(255),
    description: zod_1.z.string().max(5000).optional(),
    record_type: zod_1.z.enum(['document', 'archive', 'certificate', 'license', 'contract', 'correspondence', 'report']).default('document'),
    classification: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted']).default('internal'),
    retention_years: zod_1.z.coerce.number().int().min(1).max(100).default(7),
    source_module: zod_1.z.string().max(100).optional(),
    source_id: zod_1.z.string().optional(),
    file_url: zod_1.z.string().max(2000).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.null()])).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(50)).max(20).optional(),
});
exports.updateRecordBody = exports.createRecordBody.partial();
exports.listRecordsQuery = common_schemas_1.paginationQuery.merge(common_schemas_1.statusFilter).extend({
    record_type: zod_1.z.string().optional(),
    classification: zod_1.z.string().optional(),
    source_module: zod_1.z.string().optional(),
    search: zod_1.z.string().max(200).optional(),
});
exports.bulkDeleteRecordsBody = common_schemas_1.bulkIdsBody;
exports.bulkUpdateRecordsBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(50),
    update: exports.updateRecordBody,
});
exports.archiveRecordBody = zod_1.z.object({
    archive_reason: zod_1.z.string().max(2000).optional(),
    archive_location: zod_1.z.string().max(500).optional(),
});
exports.applyRetentionPolicyBody = zod_1.z.object({
    policy_name: zod_1.z.string().min(1).max(100),
    retention_years: zod_1.z.coerce.number().int().min(1).max(100),
    applies_to: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    auto_dispose: zod_1.z.boolean().default(false),
});
exports.addRecordVersionBody = zod_1.z.object({
    version_label: zod_1.z.string().min(1).max(50),
    file_url: zod_1.z.string().max(2000),
    change_summary: zod_1.z.string().max(2000).optional(),
});
// ── Response Schemas ──────────────────────────────────────────
exports.recordsResponseSchema = zod_1.z.object({
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
exports.recordsListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(exports.recordsResponseSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
});
// ── Event Payload Schema ─────────────────────────────────────
exports.recordsEventPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    moduleCode: zod_1.z.literal('records'),
    triggeredBy: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    correlationId: zod_1.z.string(),
    eventVersion: zod_1.z.number().int().min(1),
    previousState: zod_1.z.string().optional(),
    newState: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
// ── Status Transition Schema ─────────────────────────────────
exports.recordsStatusTransitionSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    fromStatus: zod_1.z.string(),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
    comments: zod_1.z.string().max(5000).optional(),
    evidenceIds: zod_1.z.array(zod_1.z.string()).optional(),
});
// ── Import/Export Schemas ─────────────────────────────────────
exports.recordsImportRowSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    external_id: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.recordsImportBatchSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.recordsImportRowSchema).min(1).max(5000),
    options: zod_1.z.object({
        skipDuplicates: zod_1.z.boolean().default(true),
        validateOnly: zod_1.z.boolean().default(false),
        overwriteExisting: zod_1.z.boolean().default(false),
    }).optional(),
});
exports.recordsExportRequestSchema = zod_1.z.object({
    format: zod_1.z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    columns: zod_1.z.array(zod_1.z.string()).optional(),
    includeArchived: zod_1.z.boolean().default(false),
});
// ── Admin Schemas ────────────────────────────────────────────
exports.recordsAdminConfigSchema = zod_1.z.object({
    moduleCode: zod_1.z.literal('records'),
    autoArchiveEnabled: zod_1.z.boolean().default(true),
    autoArchiveAfterDays: zod_1.z.number().int().min(30).max(3650).default(365),
    defaultVisibility: zod_1.z.enum(['team', 'department', 'org', 'global']).default('org'),
    notificationsEnabled: zod_1.z.boolean().default(true),
    aiAssistEnabled: zod_1.z.boolean().default(true),
    workflowEnabled: zod_1.z.boolean().default(true),
    maxItemsPerPage: zod_1.z.number().int().min(10).max(200).default(50),
});
// ── Bulk Operation Schemas ───────────────────────────────────
exports.recordsBulkUpdateSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    update: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.recordsBulkStatusChangeSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
// ── Auto-generated validation schemas (enterprise hardening) ──
exports.updateConfigBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createReseedBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createReindexBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createBackfillBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createPoliciesBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createEnforceBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createLegalHoldsBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createReleaseBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createRulesBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createSavedSearchesBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createRunBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createTransitionBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createClassifyBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createTagsBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createDisposalBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createApproveBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createRejectBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createExecuteBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.bulkDisposalBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    action: zod_1.z.string().min(1).max(50).optional(),
});
exports.bulkTransitionBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    action: zod_1.z.string().min(1).max(50).optional(),
});
exports.bulkClassifyBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    action: zod_1.z.string().min(1).max(50).optional(),
});
//# sourceMappingURL=records.schemas.js.map