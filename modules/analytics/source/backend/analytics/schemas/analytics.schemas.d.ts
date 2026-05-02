/**
 * Zod validation schemas for Analytics module.
 * Used with validate() middleware in analytics route files.
 */
import { z } from 'zod';
export declare const dashboardQuery: z.ZodObject<{
    period: z.ZodDefault<z.ZodEnum<["day", "week", "month", "quarter", "year"]>>;
    module_code: z.ZodOptional<z.ZodString>;
    from_date: z.ZodOptional<z.ZodString>;
    to_date: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period: "day" | "week" | "month" | "quarter" | "year";
    module_code?: string | undefined;
    from_date?: string | undefined;
    to_date?: string | undefined;
}, {
    period?: "day" | "week" | "month" | "quarter" | "year" | undefined;
    module_code?: string | undefined;
    from_date?: string | undefined;
    to_date?: string | undefined;
}>;
export declare const kpiQuery: z.ZodObject<{
    kpi_codes: z.ZodArray<z.ZodString, "many">;
    date_range: z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        from: string;
        to: string;
    }, {
        from: string;
        to: string;
    }>;
    granularity: z.ZodDefault<z.ZodEnum<["day", "week", "month"]>>;
}, "strip", z.ZodTypeAny, {
    kpi_codes: string[];
    date_range: {
        from: string;
        to: string;
    };
    granularity: "day" | "week" | "month";
}, {
    kpi_codes: string[];
    date_range: {
        from: string;
        to: string;
    };
    granularity?: "day" | "week" | "month" | undefined;
}>;
export declare const createReportBody: z.ZodObject<{
    title: z.ZodString;
    type: z.ZodEnum<["executive", "compliance", "risk", "audit", "custom"]>;
    filters: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>>>;
    description: z.ZodOptional<z.ZodString>;
    scheduled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    scheduled: boolean;
    type: "risk" | "compliance" | "audit" | "executive" | "custom";
    filters: Record<string, string | number | boolean | string[]>;
    description?: string | undefined;
}, {
    title: string;
    type: "risk" | "compliance" | "audit" | "executive" | "custom";
    scheduled?: boolean | undefined;
    filters?: Record<string, string | number | boolean | string[]> | undefined;
    description?: string | undefined;
}>;
export declare const updateReportBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["executive", "compliance", "risk", "audit", "custom"]>>;
    filters: z.ZodOptional<z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodArray<z.ZodString, "many">]>>>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    scheduled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    scheduled?: boolean | undefined;
    type?: "risk" | "compliance" | "audit" | "executive" | "custom" | undefined;
    filters?: Record<string, string | number | boolean | string[]> | undefined;
    description?: string | undefined;
}, {
    title?: string | undefined;
    scheduled?: boolean | undefined;
    type?: "risk" | "compliance" | "audit" | "executive" | "custom" | undefined;
    filters?: Record<string, string | number | boolean | string[]> | undefined;
    description?: string | undefined;
}>;
export declare const listReportsQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
} & {
    type: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    sortBy?: string | undefined;
    pageSize?: number | undefined;
    type?: string | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    type?: string | undefined;
}>;
export declare const exportQuery: z.ZodObject<{
    format: z.ZodEnum<["pdf", "csv", "xlsx", "json"]>;
    date_range: z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        from: string;
        to: string;
    }, {
        from: string;
        to: string;
    }>;
    module_code: z.ZodOptional<z.ZodString>;
    include_charts: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    format: "csv" | "xlsx" | "pdf" | "json";
    date_range: {
        from: string;
        to: string;
    };
    include_charts: boolean;
    module_code?: string | undefined;
}, {
    format: "csv" | "xlsx" | "pdf" | "json";
    date_range: {
        from: string;
        to: string;
    };
    module_code?: string | undefined;
    include_charts?: boolean | undefined;
}>;
export declare const analyticsResponseSchema: z.ZodObject<{
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
    title: string;
    status: string;
    created_by: string;
    id: string;
    created_at: string;
    tenant_id: string;
    updated_at: string;
    description?: string | undefined;
    updated_by?: string | undefined;
}, {
    title: string;
    status: string;
    created_by: string;
    id: string;
    created_at: string;
    tenant_id: string;
    updated_at: string;
    description?: string | undefined;
    updated_by?: string | undefined;
}>;
export declare const analyticsListResponseSchema: z.ZodObject<{
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
        title: string;
        status: string;
        created_by: string;
        id: string;
        created_at: string;
        tenant_id: string;
        updated_at: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }, {
        title: string;
        status: string;
        created_by: string;
        id: string;
        created_at: string;
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
    data: {
        title: string;
        status: string;
        created_by: string;
        id: string;
        created_at: string;
        tenant_id: string;
        updated_at: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }[];
    page: number;
    pageSize: number;
}, {
    total: number;
    data: {
        title: string;
        status: string;
        created_by: string;
        id: string;
        created_at: string;
        tenant_id: string;
        updated_at: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }[];
    page: number;
    pageSize: number;
}>;
export declare const analyticsEventPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    entityType: z.ZodString;
    entityId: z.ZodString;
    moduleCode: z.ZodLiteral<"analytics">;
    triggeredBy: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodString;
    eventVersion: z.ZodNumber;
    previousState: z.ZodOptional<z.ZodString>;
    newState: z.ZodOptional<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: "analytics";
    triggeredBy: string;
    correlationId: string;
    data: Record<string, unknown>;
    timestamp: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}, {
    tenantId: string;
    entityType: string;
    entityId: string;
    moduleCode: "analytics";
    triggeredBy: string;
    correlationId: string;
    data: Record<string, unknown>;
    timestamp: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}>;
export declare const analyticsStatusTransitionSchema: z.ZodObject<{
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
export declare const analyticsImportRowSchema: z.ZodObject<{
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
export declare const analyticsImportBatchSchema: z.ZodObject<{
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
export declare const analyticsExportRequestSchema: z.ZodObject<{
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
export declare const analyticsAdminConfigSchema: z.ZodObject<{
    moduleCode: z.ZodLiteral<"analytics">;
    autoArchiveEnabled: z.ZodDefault<z.ZodBoolean>;
    autoArchiveAfterDays: z.ZodDefault<z.ZodNumber>;
    defaultVisibility: z.ZodDefault<z.ZodEnum<["team", "department", "org", "global"]>>;
    notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
    aiAssistEnabled: z.ZodDefault<z.ZodBoolean>;
    workflowEnabled: z.ZodDefault<z.ZodBoolean>;
    maxItemsPerPage: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    defaultVisibility: "org" | "team" | "department" | "global";
    moduleCode: "analytics";
    autoArchiveEnabled: boolean;
    autoArchiveAfterDays: number;
    notificationsEnabled: boolean;
    aiAssistEnabled: boolean;
    workflowEnabled: boolean;
    maxItemsPerPage: number;
}, {
    moduleCode: "analytics";
    defaultVisibility?: "org" | "team" | "department" | "global" | undefined;
    autoArchiveEnabled?: boolean | undefined;
    autoArchiveAfterDays?: number | undefined;
    notificationsEnabled?: boolean | undefined;
    aiAssistEnabled?: boolean | undefined;
    workflowEnabled?: boolean | undefined;
    maxItemsPerPage?: number | undefined;
}>;
export declare const analyticsBulkUpdateSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    update: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    update: Record<string, unknown>;
    ids: string[];
}, {
    update: Record<string, unknown>;
    ids: string[];
}>;
export declare const analyticsBulkStatusChangeSchema: z.ZodObject<{
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
export declare let updateDashboardconfigBody: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export type UpdateDashboardconfigBodyInput = z.infer<typeof updateDashboardconfigBody>;
export declare let createBenchmarkBody: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export type CreateBenchmarkBodyInput = z.infer<typeof createBenchmarkBody>;
export declare let createMaturityAssessBody: z.ZodObject<{
    complianceScore: z.ZodOptional<z.ZodUnknown>;
    riskScore: z.ZodOptional<z.ZodUnknown>;
    evidenceCoverage: z.ZodOptional<z.ZodUnknown>;
    processMaturity: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    complianceScore?: unknown;
    riskScore?: unknown;
    evidenceCoverage?: unknown;
    processMaturity?: unknown;
}, {
    complianceScore?: unknown;
    riskScore?: unknown;
    evidenceCoverage?: unknown;
    processMaturity?: unknown;
}>;
export type CreateMaturityAssessBodyInput = z.infer<typeof createMaturityAssessBody>;
export declare let createWidgetsBatchBody: z.ZodObject<{
    widgetIds: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    widgetIds?: unknown;
}, {
    widgetIds?: unknown;
}>;
export type CreateWidgetsBatchBodyInput = z.infer<typeof createWidgetsBatchBody>;
export declare let createKeyItemsBody: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export type CreateKeyItemsBodyInput = z.infer<typeof createKeyItemsBody>;
export declare let updateKeyItemsitemIdBody: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export type UpdateKeyItemsitemIdBodyInput = z.infer<typeof updateKeyItemsitemIdBody>;
export declare let updateKeyItemsitemIdStatusBody: z.ZodObject<{
    status: z.ZodOptional<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    status?: unknown;
}, {
    status?: unknown;
}>;
export type UpdateKeyItemsitemIdStatusBodyInput = z.infer<typeof updateKeyItemsitemIdStatusBody>;
export declare const updateConfigBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createReseedBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createReindexBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createBackfillBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    title?: string | undefined;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
