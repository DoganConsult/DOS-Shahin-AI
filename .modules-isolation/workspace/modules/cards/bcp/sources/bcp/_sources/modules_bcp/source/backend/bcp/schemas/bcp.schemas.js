"use strict";
/**
 * Zod validation schemas for BCP (Business Continuity Planning) module.
 * Used with validate() middleware in bcp route files.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReindexBody = exports.createReseedBody = exports.updateConfigBody = exports.createCloseBody = exports.createVerifyBody = exports.linkBiaBody = exports.updateServiceBody = exports.createServiceBody = exports.updateFindingBody = exports.createFindingBody = exports.resolveCrisisBody = exports.timelineEntryBody = exports.updateStatusBody = exports.declareCrisisBody = exports.createBusinesschangeimpactBody = exports.createMaturityBody = exports.createDependencymapsBody = exports.createDeactivateactivationIdBody = exports.updateRecoverystepsstepIdBody = exports.createActivateBody = exports.createRecoverystrategiesstrategyIdLinkbiaBody = exports.createRecoverystrategiesBody = exports.createCrisiscommplanIdActivateBody = exports.createCrisiscommBody = exports.createExercisesexerciseIdResultsBody = exports.createExercisesBody = exports.createBiabiaIdCalculateBody = exports.createBiaBody = exports.bcpBulkStatusChangeSchema = exports.bcpBulkUpdateSchema = exports.bcpAdminConfigSchema = exports.bcpExportRequestSchema = exports.bcpImportBatchSchema = exports.bcpImportRowSchema = exports.bcpStatusTransitionSchema = exports.bcpEventPayloadSchema = exports.bcpListResponseSchema = exports.bcpResponseSchema = exports.listBCPQuery = exports.documentRecoveryBody = exports.scheduleDRTestBody = exports.updateBCPBody = exports.createBCPBody = exports.bulkUpdateBcpPlansBody = exports.bulkDeleteBcpPlansBody = exports.updateBcpTestBody = exports.createBcpTestBody = exports.listBcpPlansQuery = exports.updateBcpPlanBody = exports.createBcpPlanBody = void 0;
exports.createBackfillBody = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("../../../schemas/common.schemas");
exports.createBcpPlanBody = zod_1.z.object({
    name: zod_1.z.string().min(3).max(255),
    description: zod_1.z.string().optional(),
    status: zod_1.z.enum(['draft', 'active', 'archived']).default('draft'),
    owner: zod_1.z.string().optional(),
    rto_hours: zod_1.z.coerce.number().min(0).optional(),
    rpo_hours: zod_1.z.coerce.number().min(0).optional(),
    last_tested_at: zod_1.z.string().datetime({ offset: true }).optional(),
});
exports.updateBcpPlanBody = exports.createBcpPlanBody.partial();
exports.listBcpPlansQuery = common_schemas_1.paginationQuery.merge(common_schemas_1.statusFilter).extend({
    owner: zod_1.z.string().optional(),
});
exports.createBcpTestBody = zod_1.z.object({
    plan_id: zod_1.z.string().uuid(),
    test_type: zod_1.z.enum(['tabletop', 'simulation', 'full']),
    scheduled_at: zod_1.z.string().datetime({ offset: true }).optional(),
    notes: zod_1.z.string().optional(),
});
exports.updateBcpTestBody = exports.createBcpTestBody.partial();
exports.bulkDeleteBcpPlansBody = common_schemas_1.bulkIdsBody;
// ── Bulk Operations ─────────────────────────────────────────────
exports.bulkUpdateBcpPlansBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    update: exports.updateBcpPlanBody,
});
// ── Legacy schemas (migrated from flat) ──
exports.createBCPBody = zod_1.z.object({
    plan_name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    rto: zod_1.z.coerce.number().min(0).optional(),
    rpo: zod_1.z.coerce.number().min(0).optional(),
    recovery_team: zod_1.z.string().optional(),
    critical_processes: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.updateBCPBody = exports.createBCPBody.partial();
exports.scheduleDRTestBody = zod_1.z.object({
    plan_id: zod_1.z.string().uuid(),
    test_date: zod_1.z.string().datetime({ offset: true }),
    test_type: zod_1.z.enum(['tabletop', 'simulation', 'full']).default('tabletop'),
    participants: zod_1.z.array(zod_1.z.string()).optional(),
    objectives: zod_1.z.string().optional(),
});
exports.documentRecoveryBody = zod_1.z.object({
    plan_id: zod_1.z.string().uuid(),
    incident_id: zod_1.z.string().uuid().optional(),
    outcome: zod_1.z.string().min(1),
    lessons_learned: zod_1.z.string().optional(),
    actual_rto: zod_1.z.coerce.number().min(0).optional(),
});
/** @deprecated
 * @removal-date Phase 9 (cleanup)
 * @owner Shahin-AI
 * @replacement inline validation in routes Use listBcpPlansQuery */
exports.listBCPQuery = exports.listBcpPlansQuery;
// ── Response Schemas ──────────────────────────────────────────
exports.bcpResponseSchema = zod_1.z.object({
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
exports.bcpListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(exports.bcpResponseSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
});
// ── Event Payload Schema ─────────────────────────────────────
exports.bcpEventPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    moduleCode: zod_1.z.literal('bcp'),
    triggeredBy: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    correlationId: zod_1.z.string(),
    eventVersion: zod_1.z.number().int().min(1),
    previousState: zod_1.z.string().optional(),
    newState: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
// ── Status Transition Schema ─────────────────────────────────
exports.bcpStatusTransitionSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    fromStatus: zod_1.z.string(),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
    comments: zod_1.z.string().max(5000).optional(),
    evidenceIds: zod_1.z.array(zod_1.z.string()).optional(),
});
// ── Import/Export Schemas ─────────────────────────────────────
exports.bcpImportRowSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    external_id: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.bcpImportBatchSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.bcpImportRowSchema).min(1).max(5000),
    options: zod_1.z.object({
        skipDuplicates: zod_1.z.boolean().default(true),
        validateOnly: zod_1.z.boolean().default(false),
        overwriteExisting: zod_1.z.boolean().default(false),
    }).optional(),
});
exports.bcpExportRequestSchema = zod_1.z.object({
    format: zod_1.z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    columns: zod_1.z.array(zod_1.z.string()).optional(),
    includeArchived: zod_1.z.boolean().default(false),
});
// ── Admin Schemas ────────────────────────────────────────────
exports.bcpAdminConfigSchema = zod_1.z.object({
    moduleCode: zod_1.z.literal('bcp'),
    autoArchiveEnabled: zod_1.z.boolean().default(true),
    autoArchiveAfterDays: zod_1.z.number().int().min(30).max(3650).default(365),
    defaultVisibility: zod_1.z.enum(['team', 'department', 'org', 'global']).default('org'),
    notificationsEnabled: zod_1.z.boolean().default(true),
    aiAssistEnabled: zod_1.z.boolean().default(true),
    workflowEnabled: zod_1.z.boolean().default(true),
    maxItemsPerPage: zod_1.z.number().int().min(10).max(200).default(50),
});
// ── Bulk Operation Schemas ───────────────────────────────────
exports.bcpBulkUpdateSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    update: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.bcpBulkStatusChangeSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
exports.createBiaBody = zod_1.z.object({
    assessor_id: zod_1.z.unknown().optional(),
});
exports.createBiabiaIdCalculateBody = zod_1.z.object({});
exports.createExercisesBody = zod_1.z.object({});
exports.createExercisesexerciseIdResultsBody = zod_1.z.object({});
exports.createCrisiscommBody = zod_1.z.object({});
exports.createCrisiscommplanIdActivateBody = zod_1.z.object({
    incident_id: zod_1.z.unknown().optional(),
});
exports.createRecoverystrategiesBody = zod_1.z.object({});
exports.createRecoverystrategiesstrategyIdLinkbiaBody = zod_1.z.object({
    bia_id: zod_1.z.unknown().optional(),
});
exports.createActivateBody = zod_1.z.object({
    plan_id: zod_1.z.unknown().optional(),
    reason: zod_1.z.unknown().optional(),
    incident_id: zod_1.z.unknown().optional(),
});
exports.updateRecoverystepsstepIdBody = zod_1.z.object({});
exports.createDeactivateactivationIdBody = zod_1.z.object({});
exports.createDependencymapsBody = zod_1.z.object({});
exports.createMaturityBody = zod_1.z.object({});
exports.createBusinesschangeimpactBody = zod_1.z.object({
    changeType: zod_1.z.string().min(1),
    entityType: zod_1.z.unknown().optional(),
    entityId: zod_1.z.unknown().optional(),
    entityName: zod_1.z.unknown().optional(),
    details: zod_1.z.unknown().optional(),
});
exports.declareCrisisBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    crisis_type: zod_1.z.string().optional(),
    severity: zod_1.z.string().optional(),
});
exports.updateStatusBody = zod_1.z.object({
    status: zod_1.z.string().min(1),
    message: zod_1.z.string().optional(),
});
exports.timelineEntryBody = zod_1.z.object({
    type: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
});
exports.resolveCrisisBody = zod_1.z.object({
    post_crisis_review: zod_1.z.string().optional(),
});
exports.createFindingBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    source_type: zod_1.z.string().optional(),
    source_id: zod_1.z.string().uuid().optional(),
    finding_type: zod_1.z.string().optional(),
    severity: zod_1.z.string().optional(),
});
exports.updateFindingBody = zod_1.z.object({});
exports.createServiceBody = zod_1.z.object({
    service_name: zod_1.z.string().min(1).max(500),
    service_code: zod_1.z.string().max(60).optional(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    criticality: zod_1.z.string().optional(),
    service_tier: zod_1.z.string().optional(),
});
exports.updateServiceBody = zod_1.z.object({});
exports.linkBiaBody = zod_1.z.object({ bia_id: zod_1.z.string().uuid() });
// ── Auto-generated validation schemas (enterprise hardening) ──
exports.createVerifyBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.createCloseBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().max(5000).optional(),
    status: zod_1.z.string().max(50).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
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
//# sourceMappingURL=bcp.schemas.js.map