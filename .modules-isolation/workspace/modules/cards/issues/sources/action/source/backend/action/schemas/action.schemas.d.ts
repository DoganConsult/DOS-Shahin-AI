/**
 * Zod validation schemas for Action module.
 * Used with validate() middleware in action route files.
 * @owner Module:action
 */
import { z } from 'zod';
export declare const actionStatusEnum: z.ZodEnum<["open", "in_progress", "completed", "verified", "closed", "overdue", "escalated", "cancelled"]>;
export type ActionStatus = z.infer<typeof actionStatusEnum>;
export declare const createActionBody: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    actionType: z.ZodEnum<["corrective", "preventive", "detective", "improvement"]>;
    assignedTo: z.ZodString;
    sourceType: z.ZodEnum<["risk", "audit", "incident", "compliance", "policy", "vendor", "manual"]>;
    sourceId: z.ZodString;
    deadline: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
}, "strip", z.ZodTypeAny, {
    assignedTo: string;
    title: string;
    sourceType: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor";
    actionType: "corrective" | "preventive" | "improvement" | "detective";
    sourceId: string;
    priority?: "high" | "critical" | "medium" | "low" | undefined;
    description?: string | undefined;
    deadline?: string | undefined;
}, {
    assignedTo: string;
    title: string;
    sourceType: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor";
    actionType: "corrective" | "preventive" | "improvement" | "detective";
    sourceId: string;
    priority?: "high" | "critical" | "medium" | "low" | undefined;
    description?: string | undefined;
    deadline?: string | undefined;
}>;
export declare const updateActionBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    actionType: z.ZodOptional<z.ZodEnum<["corrective", "preventive", "detective", "improvement"]>>;
    assignedTo: z.ZodOptional<z.ZodString>;
    sourceType: z.ZodOptional<z.ZodEnum<["risk", "audit", "incident", "compliance", "policy", "vendor", "manual"]>>;
    sourceId: z.ZodOptional<z.ZodString>;
    deadline: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    priority: z.ZodOptional<z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>>;
}, "strip", z.ZodTypeAny, {
    assignedTo?: string | undefined;
    priority?: "high" | "critical" | "medium" | "low" | undefined;
    title?: string | undefined;
    sourceType?: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor" | undefined;
    description?: string | undefined;
    actionType?: "corrective" | "preventive" | "improvement" | "detective" | undefined;
    sourceId?: string | undefined;
    deadline?: string | undefined;
}, {
    assignedTo?: string | undefined;
    priority?: "high" | "critical" | "medium" | "low" | undefined;
    title?: string | undefined;
    sourceType?: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor" | undefined;
    description?: string | undefined;
    actionType?: "corrective" | "preventive" | "improvement" | "detective" | undefined;
    sourceId?: string | undefined;
    deadline?: string | undefined;
}>;
export declare const createTransitionBody: z.ZodObject<{
    status: z.ZodEnum<["open", "in_progress", "completed", "verified", "closed", "overdue", "escalated", "cancelled"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "open" | "in_progress" | "completed" | "verified" | "closed" | "cancelled" | "overdue" | "escalated";
    note?: string | undefined;
}, {
    status: "open" | "in_progress" | "completed" | "verified" | "closed" | "cancelled" | "overdue" | "escalated";
    note?: string | undefined;
}>;
export declare const createCancelBody: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const createReopenBody: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export declare const verifyBody: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export declare const closeBody: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export declare const escalateBody: z.ZodObject<{
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    reason?: string | undefined;
}, {
    reason?: string | undefined;
}>;
export declare const completeBody: z.ZodObject<{
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    note?: string | undefined;
}, {
    note?: string | undefined;
}>;
export declare const createBlockersBody: z.ZodObject<{
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
}, {
    description: string;
}>;
export declare const createResolveBody: z.ZodObject<{
    resolution: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    resolution?: string | undefined;
}, {
    resolution?: string | undefined;
}>;
export declare const createDependenciesBody: z.ZodObject<{
    dependsOnId: z.ZodString;
    dependencyType: z.ZodEnum<["blocks", "relates_to", "duplicates", "depends_on"]>;
}, "strip", z.ZodTypeAny, {
    dependsOnId: string;
    dependencyType: "blocks" | "relates_to" | "duplicates" | "depends_on";
}, {
    dependsOnId: string;
    dependencyType: "blocks" | "relates_to" | "duplicates" | "depends_on";
}>;
export declare const createEvidenceBody: z.ZodObject<{
    description: z.ZodString;
    fileReference: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    fileReference?: string | undefined;
}, {
    description: string;
    fileReference?: string | undefined;
}>;
export declare const bulkTransitionBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    status: z.ZodEnum<["open", "in_progress", "completed", "verified", "closed", "overdue", "escalated", "cancelled"]>;
}, "strip", z.ZodTypeAny, {
    status: "open" | "in_progress" | "completed" | "verified" | "closed" | "cancelled" | "overdue" | "escalated";
    ids: string[];
}, {
    status: "open" | "in_progress" | "completed" | "verified" | "closed" | "cancelled" | "overdue" | "escalated";
    ids: string[];
}>;
export declare const assignBody: z.ZodObject<{
    assigneeId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    assigneeId: string;
}, {
    assigneeId: string;
}>;
export declare const reassignBody: z.ZodObject<{
    assigneeId: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    assigneeId: string;
}, {
    reason: string;
    assigneeId: string;
}>;
export declare const setDueDateBody: z.ZodObject<{
    dueDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    dueDate: string;
}, {
    dueDate: string;
}>;
export declare const extendDeadlineBody: z.ZodObject<{
    newDueDate: z.ZodString;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    newDueDate: string;
}, {
    reason: string;
    newDueDate: string;
}>;
export declare const listActionsQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
} & {
    owner: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    source_type: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    status?: string | undefined;
    source_type?: string | undefined;
    sortBy?: string | undefined;
    pageSize?: number | undefined;
    owner?: string | undefined;
}, {
    status?: string | undefined;
    source_type?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    owner?: string | undefined;
}>;
export declare const closeActionBody: z.ZodObject<{
    resolution: z.ZodOptional<z.ZodString>;
    evidence_id: z.ZodOptional<z.ZodString>;
    effectiveness: z.ZodOptional<z.ZodEnum<["effective", "partially_effective", "ineffective"]>>;
}, "strip", z.ZodTypeAny, {
    resolution?: string | undefined;
    evidence_id?: string | undefined;
    effectiveness?: "effective" | "partially_effective" | "ineffective" | undefined;
}, {
    resolution?: string | undefined;
    evidence_id?: string | undefined;
    effectiveness?: "effective" | "partially_effective" | "ineffective" | undefined;
}>;
export declare const reassignActionBody: z.ZodObject<{
    new_owner: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    new_due_date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    new_owner: string;
    reason?: string | undefined;
    new_due_date?: string | undefined;
}, {
    new_owner: string;
    reason?: string | undefined;
    new_due_date?: string | undefined;
}>;
export declare const linkActionBody: z.ZodObject<{
    source_type: z.ZodEnum<["risk", "audit", "incident", "compliance", "policy", "vendor"]>;
    source_id: z.ZodString;
    link_type: z.ZodDefault<z.ZodEnum<["corrective", "preventive", "detective"]>>;
}, "strip", z.ZodTypeAny, {
    source_type: "audit" | "incident" | "compliance" | "risk" | "policy" | "vendor";
    source_id: string;
    link_type: "corrective" | "preventive" | "detective";
}, {
    source_type: "audit" | "incident" | "compliance" | "risk" | "policy" | "vendor";
    source_id: string;
    link_type?: "corrective" | "preventive" | "detective" | undefined;
}>;
export declare const bulkDeleteActionsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ids: string[];
}, {
    ids: string[];
}>;
export declare const bulkUpdateActionsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        actionType: z.ZodOptional<z.ZodEnum<["corrective", "preventive", "detective", "improvement"]>>;
        assignedTo: z.ZodOptional<z.ZodString>;
        sourceType: z.ZodOptional<z.ZodEnum<["risk", "audit", "incident", "compliance", "policy", "vendor", "manual"]>>;
        sourceId: z.ZodOptional<z.ZodString>;
        deadline: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        priority: z.ZodOptional<z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>>;
    }, "strip", z.ZodTypeAny, {
        assignedTo?: string | undefined;
        priority?: "high" | "critical" | "medium" | "low" | undefined;
        title?: string | undefined;
        sourceType?: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor" | undefined;
        description?: string | undefined;
        actionType?: "corrective" | "preventive" | "improvement" | "detective" | undefined;
        sourceId?: string | undefined;
        deadline?: string | undefined;
    }, {
        assignedTo?: string | undefined;
        priority?: "high" | "critical" | "medium" | "low" | undefined;
        title?: string | undefined;
        sourceType?: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor" | undefined;
        description?: string | undefined;
        actionType?: "corrective" | "preventive" | "improvement" | "detective" | undefined;
        sourceId?: string | undefined;
        deadline?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    update: {
        assignedTo?: string | undefined;
        priority?: "high" | "critical" | "medium" | "low" | undefined;
        title?: string | undefined;
        sourceType?: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor" | undefined;
        description?: string | undefined;
        actionType?: "corrective" | "preventive" | "improvement" | "detective" | undefined;
        sourceId?: string | undefined;
        deadline?: string | undefined;
    };
    ids: string[];
}, {
    update: {
        assignedTo?: string | undefined;
        priority?: "high" | "critical" | "medium" | "low" | undefined;
        title?: string | undefined;
        sourceType?: "audit" | "incident" | "compliance" | "manual" | "risk" | "policy" | "vendor" | undefined;
        description?: string | undefined;
        actionType?: "corrective" | "preventive" | "improvement" | "detective" | undefined;
        sourceId?: string | undefined;
        deadline?: string | undefined;
    };
    ids: string[];
}>;
export declare const addActionCommentBody: z.ZodObject<{
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
}, {
    text: string;
}>;
export declare const actionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    tenant_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodString;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    created_by: z.ZodString;
    updated_by: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    created_by: string;
    status: string;
    title: string;
    created_at: string;
    id: string;
    tenant_id: string;
    updated_at: string;
    description?: string | undefined;
    updated_by?: string | undefined;
}, {
    created_by: string;
    status: string;
    title: string;
    created_at: string;
    id: string;
    tenant_id: string;
    updated_at: string;
    description?: string | undefined;
    updated_by?: string | undefined;
}>;
export declare const actionListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        tenant_id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodString;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        created_by: z.ZodString;
        updated_by: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        created_by: string;
        status: string;
        title: string;
        created_at: string;
        id: string;
        tenant_id: string;
        updated_at: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }, {
        created_by: string;
        status: string;
        title: string;
        created_at: string;
        id: string;
        tenant_id: string;
        updated_at: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    page: number;
    pageSize: number;
    data: {
        created_by: string;
        status: string;
        title: string;
        created_at: string;
        id: string;
        tenant_id: string;
        updated_at: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }[];
}, {
    total: number;
    page: number;
    pageSize: number;
    data: {
        created_by: string;
        status: string;
        title: string;
        created_at: string;
        id: string;
        tenant_id: string;
        updated_at: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }[];
}>;
export declare const actionEventPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    entityType: z.ZodString;
    entityId: z.ZodString;
    moduleCode: z.ZodLiteral<"action">;
    triggeredBy: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodString;
    eventVersion: z.ZodNumber;
    previousState: z.ZodOptional<z.ZodString>;
    newState: z.ZodOptional<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    moduleCode: "action";
    tenantId: string;
    entityType: string;
    entityId: string;
    correlationId: string;
    data: Record<string, unknown>;
    triggeredBy: string;
    timestamp: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}, {
    moduleCode: "action";
    tenantId: string;
    entityType: string;
    entityId: string;
    correlationId: string;
    data: Record<string, unknown>;
    triggeredBy: string;
    timestamp: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}>;
export declare const actionStatusTransitionSchema: z.ZodObject<{
    entityId: z.ZodString;
    fromStatus: z.ZodString;
    toStatus: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
    comments: z.ZodOptional<z.ZodString>;
    evidenceIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    entityId: string;
    fromStatus: string;
    toStatus: string;
    reason?: string | undefined;
    comments?: string | undefined;
    evidenceIds?: string[] | undefined;
}, {
    entityId: string;
    fromStatus: string;
    toStatus: string;
    reason?: string | undefined;
    comments?: string | undefined;
    evidenceIds?: string[] | undefined;
}>;
export declare const actionImportRowSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    external_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    status?: string | undefined;
    description?: string | undefined;
    external_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title: string;
    status?: string | undefined;
    description?: string | undefined;
    external_id?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const actionImportBatchSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        external_id: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        status?: string | undefined;
        description?: string | undefined;
        external_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        title: string;
        status?: string | undefined;
        description?: string | undefined;
        external_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>, "many">;
    options: z.ZodOptional<z.ZodObject<{
        skipDuplicates: z.ZodDefault<z.ZodBoolean>;
        validateOnly: z.ZodDefault<z.ZodBoolean>;
        overwriteExisting: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        skipDuplicates: boolean;
        validateOnly: boolean;
        overwriteExisting: boolean;
    }, {
        skipDuplicates?: boolean | undefined;
        validateOnly?: boolean | undefined;
        overwriteExisting?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    rows: {
        title: string;
        status?: string | undefined;
        description?: string | undefined;
        external_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    options?: {
        skipDuplicates: boolean;
        validateOnly: boolean;
        overwriteExisting: boolean;
    } | undefined;
}, {
    rows: {
        title: string;
        status?: string | undefined;
        description?: string | undefined;
        external_id?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }[];
    options?: {
        skipDuplicates?: boolean | undefined;
        validateOnly?: boolean | undefined;
        overwriteExisting?: boolean | undefined;
    } | undefined;
}>;
export declare const actionExportRequestSchema: z.ZodObject<{
    format: z.ZodDefault<z.ZodEnum<["csv", "xlsx", "json", "pdf"]>>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    columns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includeArchived: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    format: "csv" | "xlsx" | "pdf" | "json";
    includeArchived: boolean;
    filters?: Record<string, string> | undefined;
    columns?: string[] | undefined;
}, {
    format?: "csv" | "xlsx" | "pdf" | "json" | undefined;
    filters?: Record<string, string> | undefined;
    columns?: string[] | undefined;
    includeArchived?: boolean | undefined;
}>;
export declare const actionAdminConfigSchema: z.ZodObject<{
    moduleCode: z.ZodLiteral<"action">;
    autoArchiveEnabled: z.ZodDefault<z.ZodBoolean>;
    autoArchiveAfterDays: z.ZodDefault<z.ZodNumber>;
    defaultVisibility: z.ZodDefault<z.ZodEnum<["team", "department", "org", "global"]>>;
    notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
    aiAssistEnabled: z.ZodDefault<z.ZodBoolean>;
    workflowEnabled: z.ZodDefault<z.ZodBoolean>;
    maxItemsPerPage: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    defaultVisibility: "org" | "team" | "department" | "global";
    moduleCode: "action";
    autoArchiveEnabled: boolean;
    autoArchiveAfterDays: number;
    notificationsEnabled: boolean;
    aiAssistEnabled: boolean;
    workflowEnabled: boolean;
    maxItemsPerPage: number;
}, {
    moduleCode: "action";
    defaultVisibility?: "org" | "team" | "department" | "global" | undefined;
    autoArchiveEnabled?: boolean | undefined;
    autoArchiveAfterDays?: number | undefined;
    notificationsEnabled?: boolean | undefined;
    aiAssistEnabled?: boolean | undefined;
    workflowEnabled?: boolean | undefined;
    maxItemsPerPage?: number | undefined;
}>;
export declare const actionBulkUpdateSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    update: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    update: Record<string, unknown>;
    ids: string[];
}, {
    update: Record<string, unknown>;
    ids: string[];
}>;
export declare const actionBulkStatusChangeSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    toStatus: z.ZodString;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ids: string[];
    toStatus: string;
    reason?: string | undefined;
}, {
    ids: string[];
    toStatus: string;
    reason?: string | undefined;
}>;
export declare const updateConfigBody: z.ZodObject<{
    autoArchiveEnabled: z.ZodOptional<z.ZodBoolean>;
    autoArchiveAfterDays: z.ZodOptional<z.ZodNumber>;
    defaultVisibility: z.ZodOptional<z.ZodEnum<["team", "department", "org", "global"]>>;
    notificationsEnabled: z.ZodOptional<z.ZodBoolean>;
    aiAssistEnabled: z.ZodOptional<z.ZodBoolean>;
    workflowEnabled: z.ZodOptional<z.ZodBoolean>;
    maxItemsPerPage: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    defaultVisibility?: "org" | "team" | "department" | "global" | undefined;
    autoArchiveEnabled?: boolean | undefined;
    autoArchiveAfterDays?: number | undefined;
    notificationsEnabled?: boolean | undefined;
    aiAssistEnabled?: boolean | undefined;
    workflowEnabled?: boolean | undefined;
    maxItemsPerPage?: number | undefined;
}, {
    defaultVisibility?: "org" | "team" | "department" | "global" | undefined;
    autoArchiveEnabled?: boolean | undefined;
    autoArchiveAfterDays?: number | undefined;
    notificationsEnabled?: boolean | undefined;
    aiAssistEnabled?: boolean | undefined;
    workflowEnabled?: boolean | undefined;
    maxItemsPerPage?: number | undefined;
}>;
export declare const createReseedBody: z.ZodObject<{
    scope: z.ZodDefault<z.ZodEnum<["all", "missing", "defaults"]>>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    scope: "all" | "missing" | "defaults";
    dryRun: boolean;
}, {
    scope?: "all" | "missing" | "defaults" | undefined;
    dryRun?: boolean | undefined;
}>;
export declare const createReindexBody: z.ZodObject<{
    entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    force: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    force: boolean;
    entityTypes?: string[] | undefined;
}, {
    entityTypes?: string[] | undefined;
    force?: boolean | undefined;
}>;
export declare const createBackfillBody: z.ZodObject<{
    entityTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    fromDate: z.ZodOptional<z.ZodString>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun: boolean;
    entityTypes?: string[] | undefined;
    fromDate?: string | undefined;
}, {
    dryRun?: boolean | undefined;
    entityTypes?: string[] | undefined;
    fromDate?: string | undefined;
}>;
