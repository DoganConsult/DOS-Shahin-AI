"use strict";
/**
 * Zod validation schemas for Action module.
 * Used with validate() middleware in action route files.
 * @owner Module:action
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackfillBody = exports.createReindexBody = exports.createReseedBody = exports.updateConfigBody = exports.actionBulkStatusChangeSchema = exports.actionBulkUpdateSchema = exports.actionAdminConfigSchema = exports.actionExportRequestSchema = exports.actionImportBatchSchema = exports.actionImportRowSchema = exports.actionStatusTransitionSchema = exports.actionEventPayloadSchema = exports.actionListResponseSchema = exports.actionResponseSchema = exports.addActionCommentBody = exports.bulkUpdateActionsBody = exports.bulkDeleteActionsBody = exports.linkActionBody = exports.reassignActionBody = exports.closeActionBody = exports.listActionsQuery = exports.extendDeadlineBody = exports.setDueDateBody = exports.reassignBody = exports.assignBody = exports.bulkTransitionBody = exports.createEvidenceBody = exports.createDependenciesBody = exports.createResolveBody = exports.createBlockersBody = exports.completeBody = exports.escalateBody = exports.closeBody = exports.verifyBody = exports.createReopenBody = exports.createCancelBody = exports.createTransitionBody = exports.updateActionBody = exports.createActionBody = exports.actionStatusEnum = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("../../schemas/common.schemas");
// ── Status Enum ─────────────────────────────────────────────────
exports.actionStatusEnum = zod_1.z.enum([
    'open', 'in_progress', 'completed', 'verified',
    'closed', 'overdue', 'escalated', 'cancelled',
]);
// ── Core CRUD ───────────────────────────────────────────────────
exports.createActionBody = zod_1.z.object({
    title: zod_1.z.string().min(3).max(500),
    description: zod_1.z.string().max(5000).optional(),
    actionType: zod_1.z.enum(['corrective', 'preventive', 'detective', 'improvement']),
    assignedTo: zod_1.z.string().uuid(),
    sourceType: zod_1.z.enum(['risk', 'audit', 'incident', 'compliance', 'policy', 'vendor', 'manual']),
    sourceId: zod_1.z.string().min(1),
    deadline: zod_1.z.string().datetime({ offset: true }).optional(),
    priority: zod_1.z.enum(['critical', 'high', 'medium', 'low']).optional(),
});
exports.updateActionBody = exports.createActionBody.partial();
// ── Lifecycle Transitions ───────────────────────────────────────
exports.createTransitionBody = zod_1.z.object({
    status: exports.actionStatusEnum,
    note: zod_1.z.string().max(5000).optional(),
});
exports.createCancelBody = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(5000),
});
exports.createReopenBody = zod_1.z.object({
    reason: zod_1.z.string().max(5000).optional(),
});
exports.verifyBody = zod_1.z.object({
    note: zod_1.z.string().max(5000).optional(),
});
exports.closeBody = zod_1.z.object({
    note: zod_1.z.string().max(5000).optional(),
});
exports.escalateBody = zod_1.z.object({
    reason: zod_1.z.string().max(5000).optional(),
});
exports.completeBody = zod_1.z.object({
    note: zod_1.z.string().max(5000).optional(),
});
// ── Blockers & Dependencies ─────────────────────────────────────
exports.createBlockersBody = zod_1.z.object({
    description: zod_1.z.string().min(1).max(5000),
});
exports.createResolveBody = zod_1.z.object({
    resolution: zod_1.z.string().max(5000).optional(),
});
exports.createDependenciesBody = zod_1.z.object({
    dependsOnId: zod_1.z.string().uuid(),
    dependencyType: zod_1.z.enum(['blocks', 'relates_to', 'duplicates', 'depends_on']),
});
// ── Evidence ────────────────────────────────────────────────────
exports.createEvidenceBody = zod_1.z.object({
    description: zod_1.z.string().min(1).max(5000),
    fileReference: zod_1.z.string().max(2048).optional(),
});
// ── Bulk ────────────────────────────────────────────────────────
exports.bulkTransitionBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
    status: exports.actionStatusEnum,
});
// ── Assignment ──────────────────────────────────────────────────
exports.assignBody = zod_1.z.object({
    assigneeId: zod_1.z.string().uuid(),
});
exports.reassignBody = zod_1.z.object({
    assigneeId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().min(1).max(5000),
});
// ── Due Dates ───────────────────────────────────────────────────
exports.setDueDateBody = zod_1.z.object({
    dueDate: zod_1.z.string().datetime({ offset: true }),
});
exports.extendDeadlineBody = zod_1.z.object({
    newDueDate: zod_1.z.string().datetime({ offset: true }),
    reason: zod_1.z.string().min(1).max(5000),
});
// ── Query / List ────────────────────────────────────────────────
exports.listActionsQuery = common_schemas_1.paginationQuery.merge(common_schemas_1.statusFilter).extend({
    owner: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    source_type: zod_1.z.string().optional(),
});
// ── Close / Reassign / Link (legacy-compatible) ─────────────────
exports.closeActionBody = zod_1.z.object({
    resolution: zod_1.z.string().max(5000).optional(),
    evidence_id: zod_1.z.string().uuid().optional(),
    effectiveness: zod_1.z.enum(['effective', 'partially_effective', 'ineffective']).optional(),
});
exports.reassignActionBody = zod_1.z.object({
    new_owner: zod_1.z.string().min(1),
    reason: zod_1.z.string().max(2000).optional(),
    new_due_date: zod_1.z.string().datetime({ offset: true }).optional(),
});
exports.linkActionBody = zod_1.z.object({
    source_type: zod_1.z.enum(['risk', 'audit', 'incident', 'compliance', 'policy', 'vendor']),
    source_id: zod_1.z.string().min(1),
    link_type: zod_1.z.enum(['corrective', 'preventive', 'detective']).default('corrective'),
});
// ── Bulk (legacy-compatible) ────────────────────────────────────
exports.bulkDeleteActionsBody = common_schemas_1.bulkIdsBody;
exports.bulkUpdateActionsBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(50),
    update: exports.updateActionBody,
});
exports.addActionCommentBody = zod_1.z.object({
    text: zod_1.z.string().min(1).max(5000),
});
// ── Response Schemas ────────────────────────────────────────────
exports.actionResponseSchema = zod_1.z.object({
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
exports.actionListResponseSchema = zod_1.z.object({
    data: zod_1.z.array(exports.actionResponseSchema),
    total: zod_1.z.number(),
    page: zod_1.z.number(),
    pageSize: zod_1.z.number(),
});
// ── Event Payload Schema ────────────────────────────────────────
exports.actionEventPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    moduleCode: zod_1.z.literal('action'),
    triggeredBy: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    correlationId: zod_1.z.string(),
    eventVersion: zod_1.z.number().int().min(1),
    previousState: zod_1.z.string().optional(),
    newState: zod_1.z.string().optional(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
// ── Status Transition Schema ────────────────────────────────────
exports.actionStatusTransitionSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    fromStatus: zod_1.z.string(),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
    comments: zod_1.z.string().max(5000).optional(),
    evidenceIds: zod_1.z.array(zod_1.z.string()).optional(),
});
// ── Import/Export Schemas ────────────────────────────────────────
exports.actionImportRowSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    external_id: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.actionImportBatchSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.actionImportRowSchema).min(1).max(5000),
    options: zod_1.z.object({
        skipDuplicates: zod_1.z.boolean().default(true),
        validateOnly: zod_1.z.boolean().default(false),
        overwriteExisting: zod_1.z.boolean().default(false),
    }).optional(),
});
exports.actionExportRequestSchema = zod_1.z.object({
    format: zod_1.z.enum(['csv', 'xlsx', 'json', 'pdf']).default('xlsx'),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
    columns: zod_1.z.array(zod_1.z.string()).optional(),
    includeArchived: zod_1.z.boolean().default(false),
});
// ── Admin Schemas ───────────────────────────────────────────────
exports.actionAdminConfigSchema = zod_1.z.object({
    moduleCode: zod_1.z.literal('action'),
    autoArchiveEnabled: zod_1.z.boolean().default(true),
    autoArchiveAfterDays: zod_1.z.number().int().min(30).max(3650).default(365),
    defaultVisibility: zod_1.z.enum(['team', 'department', 'org', 'global']).default('org'),
    notificationsEnabled: zod_1.z.boolean().default(true),
    aiAssistEnabled: zod_1.z.boolean().default(true),
    workflowEnabled: zod_1.z.boolean().default(true),
    maxItemsPerPage: zod_1.z.number().int().min(10).max(200).default(50),
});
// ── Bulk Operation Schemas ──────────────────────────────────────
exports.actionBulkUpdateSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    update: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
});
exports.actionBulkStatusChangeSchema = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string()).min(1).max(100),
    toStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
// ── Admin Operation Schemas ─────────────────────────────────────
exports.updateConfigBody = zod_1.z.object({
    autoArchiveEnabled: zod_1.z.boolean().optional(),
    autoArchiveAfterDays: zod_1.z.number().int().min(30).max(3650).optional(),
    defaultVisibility: zod_1.z.enum(['team', 'department', 'org', 'global']).optional(),
    notificationsEnabled: zod_1.z.boolean().optional(),
    aiAssistEnabled: zod_1.z.boolean().optional(),
    workflowEnabled: zod_1.z.boolean().optional(),
    maxItemsPerPage: zod_1.z.number().int().min(10).max(200).optional(),
});
exports.createReseedBody = zod_1.z.object({
    scope: zod_1.z.enum(['all', 'missing', 'defaults']).default('missing'),
    dryRun: zod_1.z.boolean().default(false),
});
exports.createReindexBody = zod_1.z.object({
    entityTypes: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(10).optional(),
    force: zod_1.z.boolean().default(false),
});
exports.createBackfillBody = zod_1.z.object({
    entityTypes: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(10).optional(),
    fromDate: zod_1.z.string().datetime({ offset: true }).optional(),
    dryRun: zod_1.z.boolean().default(false),
});
//# sourceMappingURL=action.schemas.js.map