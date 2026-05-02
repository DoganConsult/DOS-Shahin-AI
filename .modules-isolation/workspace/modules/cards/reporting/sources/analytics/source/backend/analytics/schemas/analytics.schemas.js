"use strict";
/**
 * Zod validation schemas for Analytics module.
 * Used with validate() middleware in analytics route files.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackfillBody = exports.createReindexBody = exports.createReseedBody = exports.updateConfigBody = exports.updateKeyItemsitemIdStatusBody = exports.updateKeyItemsitemIdBody = exports.createKeyItemsBody = exports.createWidgetsBatchBody = exports.createMaturityAssessBody = exports.createBenchmarkBody = exports.updateDashboardconfigBody = exports.analyticsBulkStatusChangeSchema = exports.analyticsBulkUpdateSchema = exports.analyticsAdminConfigSchema = exports.analyticsExportRequestSchema = exports.analyticsImportBatchSchema = exports.analyticsImportRowSchema = exports.analyticsStatusTransitionSchema = exports.analyticsEventPayloadSchema = exports.analyticsListResponseSchema = exports.analyticsResponseSchema = exports.exportQuery = exports.listReportsQuery = exports.updateReportBody = exports.createReportBody = exports.kpiQuery = exports.dashboardQuery = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("../../../schemas/common.schemas");
// -- Dashboard & KPI Queries --------------------------------------------------
exports.dashboardQuery = zod_1.z.object({
    period: zod_1.z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
    module_code: zod_1.z.string().max(50).optional(),
    from_date: zod_1.z.string().datetime({ offset: true }).optional(),
    to_date: zod_1.z.string().datetime({ offset: true }).optional(),
});
exports.kpiQuery = zod_1.z.object({
    kpi_codes: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(50),
    date_range: zod_1.z.object({
        from: zod_1.z.string().datetime({ offset: true }),
        to: zod_1.z.string().datetime({ offset: true }),
    }),
    granularity: zod_1.z.enum(['day', 'week', 'month']).default('month'),
});
// -- Report CRUD --------------------------------------------------------------
exports.createReportBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    type: zod_1.z.enum(['executive', 'compliance', 'risk', 'audit', 'custom']),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.union([zod_1.z.string(), zod_1.z.number(), zod_1.z.boolean(), zod_1.z.array(zod_1.z.string())])).default({}),
    description: zod_1.z.string().optional(),
    scheduled: zod_1.z.boolean().default(false),
});
exports.updateReportBody = exports.createReportBody.partial();
exports.listReportsQuery = common_schemas_1.paginationQuery.extend({
    type: zod_1.z.string().optional(),
});
// -- Export -------------------------------------------------------------------
exports.exportQuery = zod_1.z.object({
    format: zod_1.z.enum(['pdf', 'csv', 'xlsx', 'json']),
    date_range: zod_1.z.object({
        from: zod_1.z.string().datetime({ offset: true }),
        to: zod_1.z.string().datetime({ offset: true }),
    }),
    module_code: zod_1.z.string().optional(),
    include_charts: zod_1.z.boolean().default(false),
});
// ── Response Schemas ──────────────────────────────────────────
exports.analyticsResponseSchema = zod_1.z.object({
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
exports.analyticsListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(exports.analyticsResponseSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
});
// ── Event Payload Schema ─────────────────────────────────────
exports.analyticsEventPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    moduleCode: zod_1.z.literal('analytics'),
    triggeredBy: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    correlationId: zod_1.z.string(),
    eventVersion: zod_1.z.number().int().min(1),
    previousState: zod_1.z.string().optional(),
    newState: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
// ── Status Transition Schema ─────────────────────────────────
exports.analyticsStatusTransitionSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    fromStatus: zod_1.z.string(),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
    comments: zod_1.z.string().max(5000).optional(),
    evidenceIds: zod_1.z.array(zod_1.z.string()).optional(),
});
// ── Import/Export Schemas ─────────────────────────────────────
exports.analyticsImportRowSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    external_id: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.analyticsImportBatchSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.analyticsImportRowSchema).min(1).max(5000),
    options: zod_1.z.object({
        skipDuplicates: zod_1.z.boolean().default(true),
        validateOnly: zod_1.z.boolean().default(false),
        overwriteExisting: zod_1.z.boolean().default(false),
    }).optional(),
});
exports.analyticsExportRequestSchema = zod_1.z.object({
    format: zod_1.z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    columns: zod_1.z.array(zod_1.z.string()).optional(),
    includeArchived: zod_1.z.boolean().default(false),
});
// ── Admin Schemas ────────────────────────────────────────────
exports.analyticsAdminConfigSchema = zod_1.z.object({
    moduleCode: zod_1.z.literal('analytics'),
    autoArchiveEnabled: zod_1.z.boolean().default(true),
    autoArchiveAfterDays: zod_1.z.number().int().min(30).max(3650).default(365),
    defaultVisibility: zod_1.z.enum(['team', 'department', 'org', 'global']).default('org'),
    notificationsEnabled: zod_1.z.boolean().default(true),
    aiAssistEnabled: zod_1.z.boolean().default(true),
    workflowEnabled: zod_1.z.boolean().default(true),
    maxItemsPerPage: zod_1.z.number().int().min(10).max(200).default(50),
});
// ── Bulk Operation Schemas ───────────────────────────────────
exports.analyticsBulkUpdateSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    update: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.analyticsBulkStatusChangeSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
exports.updateDashboardconfigBody = zod_1.z.object({});
exports.createBenchmarkBody = zod_1.z.object({});
exports.createMaturityAssessBody = zod_1.z.object({
    complianceScore: zod_1.z.unknown().optional(),
    riskScore: zod_1.z.unknown().optional(),
    evidenceCoverage: zod_1.z.unknown().optional(),
    processMaturity: zod_1.z.unknown().optional(),
});
exports.createWidgetsBatchBody = zod_1.z.object({
    widgetIds: zod_1.z.unknown().optional(),
});
exports.createKeyItemsBody = zod_1.z.object({});
exports.updateKeyItemsitemIdBody = zod_1.z.object({});
exports.updateKeyItemsitemIdStatusBody = zod_1.z.object({
    status: zod_1.z.unknown().optional(),
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
//# sourceMappingURL=analytics.schemas.js.map