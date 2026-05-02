import { z } from 'zod';
export declare const createRecordBody: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    record_type: z.ZodDefault<z.ZodEnum<["document", "archive", "certificate", "license", "contract", "correspondence", "report"]>>;
    classification: z.ZodDefault<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>;
    retention_years: z.ZodDefault<z.ZodNumber>;
    source_module: z.ZodOptional<z.ZodString>;
    source_id: z.ZodOptional<z.ZodString>;
    file_url: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    classification: "confidential" | "public" | "internal" | "restricted";
    record_type: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report";
    title: string;
    retention_years: number;
    description?: string | undefined;
    source_module?: string | undefined;
    source_id?: string | undefined;
    file_url?: string | undefined;
    metadata?: Record<string, string | number | boolean | null> | undefined;
    tags?: string[] | undefined;
}, {
    title: string;
    classification?: "confidential" | "public" | "internal" | "restricted" | undefined;
    record_type?: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report" | undefined;
    description?: string | undefined;
    retention_years?: number | undefined;
    source_module?: string | undefined;
    source_id?: string | undefined;
    file_url?: string | undefined;
    metadata?: Record<string, string | number | boolean | null> | undefined;
    tags?: string[] | undefined;
}>;
export declare const updateRecordBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    record_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["document", "archive", "certificate", "license", "contract", "correspondence", "report"]>>>;
    classification: z.ZodOptional<z.ZodDefault<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>>;
    retention_years: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    source_module: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    source_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    file_url: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    classification?: "confidential" | "public" | "internal" | "restricted" | undefined;
    record_type?: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    retention_years?: number | undefined;
    source_module?: string | undefined;
    source_id?: string | undefined;
    file_url?: string | undefined;
    metadata?: Record<string, string | number | boolean | null> | undefined;
    tags?: string[] | undefined;
}, {
    classification?: "confidential" | "public" | "internal" | "restricted" | undefined;
    record_type?: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    retention_years?: number | undefined;
    source_module?: string | undefined;
    source_id?: string | undefined;
    file_url?: string | undefined;
    metadata?: Record<string, string | number | boolean | null> | undefined;
    tags?: string[] | undefined;
}>;
export declare const listRecordsQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodString>;
} & {
    record_type: z.ZodOptional<z.ZodString>;
    classification: z.ZodOptional<z.ZodString>;
    source_module: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    classification?: string | undefined;
    status?: string | undefined;
    record_type?: string | undefined;
    sortBy?: string | undefined;
    pageSize?: number | undefined;
    source_module?: string | undefined;
    search?: string | undefined;
}, {
    classification?: string | undefined;
    status?: string | undefined;
    record_type?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    source_module?: string | undefined;
    search?: string | undefined;
}>;
export declare const bulkDeleteRecordsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ids: string[];
}, {
    ids: string[];
}>;
export declare const bulkUpdateRecordsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    update: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        record_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["document", "archive", "certificate", "license", "contract", "correspondence", "report"]>>>;
        classification: z.ZodOptional<z.ZodDefault<z.ZodEnum<["public", "internal", "confidential", "restricted"]>>>;
        retention_years: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        source_module: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        source_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        file_url: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>>;
        tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        classification?: "confidential" | "public" | "internal" | "restricted" | undefined;
        record_type?: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        retention_years?: number | undefined;
        source_module?: string | undefined;
        source_id?: string | undefined;
        file_url?: string | undefined;
        metadata?: Record<string, string | number | boolean | null> | undefined;
        tags?: string[] | undefined;
    }, {
        classification?: "confidential" | "public" | "internal" | "restricted" | undefined;
        record_type?: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        retention_years?: number | undefined;
        source_module?: string | undefined;
        source_id?: string | undefined;
        file_url?: string | undefined;
        metadata?: Record<string, string | number | boolean | null> | undefined;
        tags?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    ids: string[];
    update: {
        classification?: "confidential" | "public" | "internal" | "restricted" | undefined;
        record_type?: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        retention_years?: number | undefined;
        source_module?: string | undefined;
        source_id?: string | undefined;
        file_url?: string | undefined;
        metadata?: Record<string, string | number | boolean | null> | undefined;
        tags?: string[] | undefined;
    };
}, {
    ids: string[];
    update: {
        classification?: "confidential" | "public" | "internal" | "restricted" | undefined;
        record_type?: "archive" | "document" | "contract" | "certificate" | "license" | "correspondence" | "report" | undefined;
        title?: string | undefined;
        description?: string | undefined;
        retention_years?: number | undefined;
        source_module?: string | undefined;
        source_id?: string | undefined;
        file_url?: string | undefined;
        metadata?: Record<string, string | number | boolean | null> | undefined;
        tags?: string[] | undefined;
    };
}>;
export declare const archiveRecordBody: z.ZodObject<{
    archive_reason: z.ZodOptional<z.ZodString>;
    archive_location: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    archive_reason?: string | undefined;
    archive_location?: string | undefined;
}, {
    archive_reason?: string | undefined;
    archive_location?: string | undefined;
}>;
export declare const applyRetentionPolicyBody: z.ZodObject<{
    policy_name: z.ZodString;
    retention_years: z.ZodNumber;
    applies_to: z.ZodArray<z.ZodString, "many">;
    auto_dispose: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    retention_years: number;
    policy_name: string;
    applies_to: string[];
    auto_dispose: boolean;
}, {
    retention_years: number;
    policy_name: string;
    applies_to: string[];
    auto_dispose?: boolean | undefined;
}>;
export declare const addRecordVersionBody: z.ZodObject<{
    version_label: z.ZodString;
    file_url: z.ZodString;
    change_summary: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    file_url: string;
    version_label: string;
    change_summary?: string | undefined;
}, {
    file_url: string;
    version_label: string;
    change_summary?: string | undefined;
}>;
export declare const recordsResponseSchema: z.ZodObject<{
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
    status: string;
    id: string;
    title: string;
    created_at: string;
    tenant_id: string;
    updated_at: string;
    created_by: string;
    description?: string | undefined;
    updated_by?: string | undefined;
}, {
    status: string;
    id: string;
    title: string;
    created_at: string;
    tenant_id: string;
    updated_at: string;
    created_by: string;
    description?: string | undefined;
    updated_by?: string | undefined;
}>;
export declare const recordsListResponseSchema: z.ZodObject<{
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
        status: string;
        id: string;
        title: string;
        created_at: string;
        tenant_id: string;
        updated_at: string;
        created_by: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }, {
        status: string;
        id: string;
        title: string;
        created_at: string;
        tenant_id: string;
        updated_at: string;
        created_by: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }>, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    pageSize: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    data: {
        status: string;
        id: string;
        title: string;
        created_at: string;
        tenant_id: string;
        updated_at: string;
        created_by: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }[];
    total: number;
    page: number;
    pageSize: number;
}, {
    data: {
        status: string;
        id: string;
        title: string;
        created_at: string;
        tenant_id: string;
        updated_at: string;
        created_by: string;
        description?: string | undefined;
        updated_by?: string | undefined;
    }[];
    total: number;
    page: number;
    pageSize: number;
}>;
export declare const recordsEventPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    entityType: z.ZodString;
    entityId: z.ZodString;
    moduleCode: z.ZodLiteral<"records">;
    triggeredBy: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodString;
    eventVersion: z.ZodNumber;
    previousState: z.ZodOptional<z.ZodString>;
    newState: z.ZodOptional<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    moduleCode: "records";
    tenantId: string;
    entityType: string;
    entityId: string;
    triggeredBy: string;
    correlationId: string;
    data: Record<string, unknown>;
    timestamp: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}, {
    moduleCode: "records";
    tenantId: string;
    entityType: string;
    entityId: string;
    triggeredBy: string;
    correlationId: string;
    data: Record<string, unknown>;
    timestamp: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}>;
export declare const recordsStatusTransitionSchema: z.ZodObject<{
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
export declare const recordsImportRowSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    external_id: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    external_id?: string | undefined;
}, {
    title: string;
    status?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    external_id?: string | undefined;
}>;
export declare const recordsImportBatchSchema: z.ZodObject<{
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
        metadata?: Record<string, unknown> | undefined;
        external_id?: string | undefined;
    }, {
        title: string;
        status?: string | undefined;
        description?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
        external_id?: string | undefined;
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
        metadata?: Record<string, unknown> | undefined;
        external_id?: string | undefined;
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
        metadata?: Record<string, unknown> | undefined;
        external_id?: string | undefined;
    }[];
    options?: {
        skipDuplicates?: boolean | undefined;
        validateOnly?: boolean | undefined;
        overwriteExisting?: boolean | undefined;
    } | undefined;
}>;
export declare const recordsExportRequestSchema: z.ZodObject<{
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
export declare const recordsAdminConfigSchema: z.ZodObject<{
    moduleCode: z.ZodLiteral<"records">;
    autoArchiveEnabled: z.ZodDefault<z.ZodBoolean>;
    autoArchiveAfterDays: z.ZodDefault<z.ZodNumber>;
    defaultVisibility: z.ZodDefault<z.ZodEnum<["team", "department", "org", "global"]>>;
    notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
    aiAssistEnabled: z.ZodDefault<z.ZodBoolean>;
    workflowEnabled: z.ZodDefault<z.ZodBoolean>;
    maxItemsPerPage: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    defaultVisibility: "team" | "department" | "org" | "global";
    moduleCode: "records";
    autoArchiveEnabled: boolean;
    autoArchiveAfterDays: number;
    notificationsEnabled: boolean;
    aiAssistEnabled: boolean;
    workflowEnabled: boolean;
    maxItemsPerPage: number;
}, {
    moduleCode: "records";
    defaultVisibility?: "team" | "department" | "org" | "global" | undefined;
    autoArchiveEnabled?: boolean | undefined;
    autoArchiveAfterDays?: number | undefined;
    notificationsEnabled?: boolean | undefined;
    aiAssistEnabled?: boolean | undefined;
    workflowEnabled?: boolean | undefined;
    maxItemsPerPage?: number | undefined;
}>;
export declare const recordsBulkUpdateSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    update: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    ids: string[];
    update: Record<string, unknown>;
}, {
    ids: string[];
    update: Record<string, unknown>;
}>;
export declare const recordsBulkStatusChangeSchema: z.ZodObject<{
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
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createReseedBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createReindexBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createBackfillBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createPoliciesBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createEnforceBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createLegalHoldsBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createReleaseBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createRulesBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createSavedSearchesBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createRunBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createTransitionBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createClassifyBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createTagsBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createDisposalBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createApproveBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createRejectBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const createExecuteBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    status?: string | undefined;
    title?: string | undefined;
    description?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const bulkDisposalBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    action: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ids: string[];
    action?: string | undefined;
}, {
    ids: string[];
    action?: string | undefined;
}>;
export declare const bulkTransitionBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    action: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ids: string[];
    action?: string | undefined;
}, {
    ids: string[];
    action?: string | undefined;
}>;
export declare const bulkClassifyBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    action: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ids: string[];
    action?: string | undefined;
}, {
    ids: string[];
    action?: string | undefined;
}>;
