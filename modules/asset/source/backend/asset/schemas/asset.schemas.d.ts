import { z } from 'zod';
export declare const createAssetBody: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    criticality: z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    status: z.ZodDefault<z.ZodEnum<["discovered", "classified", "managed", "review_due", "decommissioning", "decommissioned"]>>;
    classification: z.ZodOptional<z.ZodString>;
    control_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    asset_category: z.ZodOptional<z.ZodString>;
    parent_asset_id: z.ZodOptional<z.ZodString>;
    business_service_id: z.ZodOptional<z.ZodString>;
    data_classification_id: z.ZodOptional<z.ZodString>;
    acquisition_date: z.ZodOptional<z.ZodString>;
    lifecycle_stage: z.ZodOptional<z.ZodEnum<["planning", "procurement", "deployment", "operation", "maintenance", "decommission", "disposed"]>>;
    valuation_amount: z.ZodOptional<z.ZodNumber>;
    valuation_currency: z.ZodOptional<z.ZodString>;
    cmdb_external_id: z.ZodOptional<z.ZodString>;
    external_exposure: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due";
    name: string;
    type: string;
    classification?: string | undefined;
    owner?: string | undefined;
    description?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    control_ids?: string[] | undefined;
    asset_category?: string | undefined;
    parent_asset_id?: string | undefined;
    business_service_id?: string | undefined;
    data_classification_id?: string | undefined;
    acquisition_date?: string | undefined;
    lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
    valuation_amount?: number | undefined;
    valuation_currency?: string | undefined;
    cmdb_external_id?: string | undefined;
    external_exposure?: boolean | undefined;
}, {
    name: string;
    type: string;
    classification?: string | undefined;
    owner?: string | undefined;
    status?: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due" | undefined;
    description?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    control_ids?: string[] | undefined;
    asset_category?: string | undefined;
    parent_asset_id?: string | undefined;
    business_service_id?: string | undefined;
    data_classification_id?: string | undefined;
    acquisition_date?: string | undefined;
    lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
    valuation_amount?: number | undefined;
    valuation_currency?: string | undefined;
    cmdb_external_id?: string | undefined;
    external_exposure?: boolean | undefined;
}>;
export declare const updateAssetBody: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    criticality: z.ZodOptional<z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["discovered", "classified", "managed", "review_due", "decommissioning", "decommissioned"]>>>;
    classification: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    control_ids: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    asset_category: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    parent_asset_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    business_service_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    data_classification_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    acquisition_date: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    lifecycle_stage: z.ZodOptional<z.ZodOptional<z.ZodEnum<["planning", "procurement", "deployment", "operation", "maintenance", "decommission", "disposed"]>>>;
    valuation_amount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    valuation_currency: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    cmdb_external_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    external_exposure: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    classification?: string | undefined;
    owner?: string | undefined;
    status?: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due" | undefined;
    description?: string | undefined;
    name?: string | undefined;
    type?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    control_ids?: string[] | undefined;
    asset_category?: string | undefined;
    parent_asset_id?: string | undefined;
    business_service_id?: string | undefined;
    data_classification_id?: string | undefined;
    acquisition_date?: string | undefined;
    lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
    valuation_amount?: number | undefined;
    valuation_currency?: string | undefined;
    cmdb_external_id?: string | undefined;
    external_exposure?: boolean | undefined;
}, {
    classification?: string | undefined;
    owner?: string | undefined;
    status?: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due" | undefined;
    description?: string | undefined;
    name?: string | undefined;
    type?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    control_ids?: string[] | undefined;
    asset_category?: string | undefined;
    parent_asset_id?: string | undefined;
    business_service_id?: string | undefined;
    data_classification_id?: string | undefined;
    acquisition_date?: string | undefined;
    lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
    valuation_amount?: number | undefined;
    valuation_currency?: string | undefined;
    cmdb_external_id?: string | undefined;
    external_exposure?: boolean | undefined;
}>;
export declare const listAssetsQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    criticality: z.ZodOptional<z.ZodString>;
    lifecycle_stage: z.ZodOptional<z.ZodString>;
    asset_category: z.ZodOptional<z.ZodString>;
    classification: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    classification?: string | undefined;
    owner?: string | undefined;
    status?: string | undefined;
    sortBy?: string | undefined;
    pageSize?: number | undefined;
    type?: string | undefined;
    criticality?: string | undefined;
    asset_category?: string | undefined;
    lifecycle_stage?: string | undefined;
}, {
    classification?: string | undefined;
    owner?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    type?: string | undefined;
    criticality?: string | undefined;
    asset_category?: string | undefined;
    lifecycle_stage?: string | undefined;
}>;
export declare const bulkDeleteAssetsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    ids: string[];
}, {
    ids: string[];
}>;
export declare const bulkUpdateAssetsBody: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    update: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        criticality: z.ZodOptional<z.ZodOptional<z.ZodEnum<["critical", "high", "medium", "low"]>>>;
        status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["discovered", "classified", "managed", "review_due", "decommissioning", "decommissioned"]>>>;
        classification: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        control_ids: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        asset_category: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        parent_asset_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        business_service_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        data_classification_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        acquisition_date: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        lifecycle_stage: z.ZodOptional<z.ZodOptional<z.ZodEnum<["planning", "procurement", "deployment", "operation", "maintenance", "decommission", "disposed"]>>>;
        valuation_amount: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        valuation_currency: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        cmdb_external_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        external_exposure: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        classification?: string | undefined;
        owner?: string | undefined;
        status?: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due" | undefined;
        description?: string | undefined;
        name?: string | undefined;
        type?: string | undefined;
        criticality?: "high" | "critical" | "medium" | "low" | undefined;
        control_ids?: string[] | undefined;
        asset_category?: string | undefined;
        parent_asset_id?: string | undefined;
        business_service_id?: string | undefined;
        data_classification_id?: string | undefined;
        acquisition_date?: string | undefined;
        lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
        valuation_amount?: number | undefined;
        valuation_currency?: string | undefined;
        cmdb_external_id?: string | undefined;
        external_exposure?: boolean | undefined;
    }, {
        classification?: string | undefined;
        owner?: string | undefined;
        status?: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due" | undefined;
        description?: string | undefined;
        name?: string | undefined;
        type?: string | undefined;
        criticality?: "high" | "critical" | "medium" | "low" | undefined;
        control_ids?: string[] | undefined;
        asset_category?: string | undefined;
        parent_asset_id?: string | undefined;
        business_service_id?: string | undefined;
        data_classification_id?: string | undefined;
        acquisition_date?: string | undefined;
        lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
        valuation_amount?: number | undefined;
        valuation_currency?: string | undefined;
        cmdb_external_id?: string | undefined;
        external_exposure?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    update: {
        classification?: string | undefined;
        owner?: string | undefined;
        status?: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due" | undefined;
        description?: string | undefined;
        name?: string | undefined;
        type?: string | undefined;
        criticality?: "high" | "critical" | "medium" | "low" | undefined;
        control_ids?: string[] | undefined;
        asset_category?: string | undefined;
        parent_asset_id?: string | undefined;
        business_service_id?: string | undefined;
        data_classification_id?: string | undefined;
        acquisition_date?: string | undefined;
        lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
        valuation_amount?: number | undefined;
        valuation_currency?: string | undefined;
        cmdb_external_id?: string | undefined;
        external_exposure?: boolean | undefined;
    };
    ids: string[];
}, {
    update: {
        classification?: string | undefined;
        owner?: string | undefined;
        status?: "discovered" | "decommissioning" | "decommissioned" | "classified" | "managed" | "review_due" | undefined;
        description?: string | undefined;
        name?: string | undefined;
        type?: string | undefined;
        criticality?: "high" | "critical" | "medium" | "low" | undefined;
        control_ids?: string[] | undefined;
        asset_category?: string | undefined;
        parent_asset_id?: string | undefined;
        business_service_id?: string | undefined;
        data_classification_id?: string | undefined;
        acquisition_date?: string | undefined;
        lifecycle_stage?: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation" | undefined;
        valuation_amount?: number | undefined;
        valuation_currency?: string | undefined;
        cmdb_external_id?: string | undefined;
        external_exposure?: boolean | undefined;
    };
    ids: string[];
}>;
export declare const createApplicationBody: z.ZodObject<{
    name: z.ZodString;
    app_type: z.ZodDefault<z.ZodEnum<["web", "mobile", "desktop", "api", "microservice", "database", "middleware", "other"]>>;
    vendor: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    environment: z.ZodDefault<z.ZodEnum<["production", "staging", "development", "dr"]>>;
    business_owner: z.ZodOptional<z.ZodString>;
    technical_owner: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    criticality: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "deprecated", "planned"]>>;
    hosting_type: z.ZodDefault<z.ZodEnum<["on-premise", "cloud", "hybrid", "saas"]>>;
    hosting_provider: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    data_classification: z.ZodOptional<z.ZodString>;
    license_type: z.ZodOptional<z.ZodString>;
    license_expiry: z.ZodOptional<z.ZodString>;
    linked_asset_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive" | "deprecated" | "planned";
    name: string;
    criticality: "high" | "critical" | "medium" | "low";
    app_type: "web" | "mobile" | "desktop" | "api" | "microservice" | "database" | "middleware" | "other";
    environment: "production" | "staging" | "development" | "dr";
    hosting_type: "cloud" | "on-premise" | "hybrid" | "saas";
    department?: string | undefined;
    vendor?: string | undefined;
    version?: string | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    hosting_provider?: string | undefined;
    url?: string | undefined;
    data_classification?: string | undefined;
    license_type?: string | undefined;
    license_expiry?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    name: string;
    department?: string | undefined;
    vendor?: string | undefined;
    status?: "active" | "inactive" | "deprecated" | "planned" | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    app_type?: "web" | "mobile" | "desktop" | "api" | "microservice" | "database" | "middleware" | "other" | undefined;
    version?: string | undefined;
    environment?: "production" | "staging" | "development" | "dr" | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    hosting_type?: "cloud" | "on-premise" | "hybrid" | "saas" | undefined;
    hosting_provider?: string | undefined;
    url?: string | undefined;
    data_classification?: string | undefined;
    license_type?: string | undefined;
    license_expiry?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const updateApplicationBody: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    app_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["web", "mobile", "desktop", "api", "microservice", "database", "middleware", "other"]>>>;
    vendor: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    version: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    environment: z.ZodOptional<z.ZodDefault<z.ZodEnum<["production", "staging", "development", "dr"]>>>;
    business_owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    technical_owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    department: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    criticality: z.ZodOptional<z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "inactive", "deprecated", "planned"]>>>;
    hosting_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["on-premise", "cloud", "hybrid", "saas"]>>>;
    hosting_provider: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    url: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    data_classification: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    license_type: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    license_expiry: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    linked_asset_ids: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    department?: string | undefined;
    vendor?: string | undefined;
    status?: "active" | "inactive" | "deprecated" | "planned" | undefined;
    name?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    app_type?: "web" | "mobile" | "desktop" | "api" | "microservice" | "database" | "middleware" | "other" | undefined;
    version?: string | undefined;
    environment?: "production" | "staging" | "development" | "dr" | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    hosting_type?: "cloud" | "on-premise" | "hybrid" | "saas" | undefined;
    hosting_provider?: string | undefined;
    url?: string | undefined;
    data_classification?: string | undefined;
    license_type?: string | undefined;
    license_expiry?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    department?: string | undefined;
    vendor?: string | undefined;
    status?: "active" | "inactive" | "deprecated" | "planned" | undefined;
    name?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    app_type?: "web" | "mobile" | "desktop" | "api" | "microservice" | "database" | "middleware" | "other" | undefined;
    version?: string | undefined;
    environment?: "production" | "staging" | "development" | "dr" | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    hosting_type?: "cloud" | "on-premise" | "hybrid" | "saas" | undefined;
    hosting_provider?: string | undefined;
    url?: string | undefined;
    data_classification?: string | undefined;
    license_type?: string | undefined;
    license_expiry?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export declare const listApplicationsQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodString>;
} & {
    app_type: z.ZodOptional<z.ZodString>;
    environment: z.ZodOptional<z.ZodString>;
    criticality: z.ZodOptional<z.ZodString>;
    vendor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    vendor?: string | undefined;
    status?: string | undefined;
    sortBy?: string | undefined;
    pageSize?: number | undefined;
    criticality?: string | undefined;
    app_type?: string | undefined;
    environment?: string | undefined;
}, {
    vendor?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    criticality?: string | undefined;
    app_type?: string | undefined;
    environment?: string | undefined;
}>;
export declare const createBusinessServiceBody: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    service_type: z.ZodDefault<z.ZodEnum<["core", "supporting", "management", "external"]>>;
    business_owner: z.ZodOptional<z.ZodString>;
    technical_owner: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    criticality: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    status: z.ZodDefault<z.ZodEnum<["active", "inactive", "planned", "deprecated"]>>;
    sla_target_uptime: z.ZodOptional<z.ZodNumber>;
    rto_hours: z.ZodOptional<z.ZodNumber>;
    rpo_hours: z.ZodOptional<z.ZodNumber>;
    parent_service_id: z.ZodOptional<z.ZodString>;
    linked_application_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    linked_asset_ids: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    status: "active" | "inactive" | "deprecated" | "planned";
    name: string;
    criticality: "high" | "critical" | "medium" | "low";
    service_type: "external" | "core" | "supporting" | "management";
    department?: string | undefined;
    description?: string | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    sla_target_uptime?: number | undefined;
    rto_hours?: number | undefined;
    rpo_hours?: number | undefined;
    parent_service_id?: string | undefined;
    linked_application_ids?: string[] | undefined;
}, {
    name: string;
    department?: string | undefined;
    status?: "active" | "inactive" | "deprecated" | "planned" | undefined;
    description?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    service_type?: "external" | "core" | "supporting" | "management" | undefined;
    sla_target_uptime?: number | undefined;
    rto_hours?: number | undefined;
    rpo_hours?: number | undefined;
    parent_service_id?: string | undefined;
    linked_application_ids?: string[] | undefined;
}>;
export declare const updateBusinessServiceBody: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    service_type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["core", "supporting", "management", "external"]>>>;
    business_owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    technical_owner: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    department: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    criticality: z.ZodOptional<z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>>;
    status: z.ZodOptional<z.ZodDefault<z.ZodEnum<["active", "inactive", "planned", "deprecated"]>>>;
    sla_target_uptime: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    rto_hours: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    rpo_hours: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    parent_service_id: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    linked_application_ids: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    linked_asset_ids: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    tags: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    department?: string | undefined;
    status?: "active" | "inactive" | "deprecated" | "planned" | undefined;
    description?: string | undefined;
    name?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    service_type?: "external" | "core" | "supporting" | "management" | undefined;
    sla_target_uptime?: number | undefined;
    rto_hours?: number | undefined;
    rpo_hours?: number | undefined;
    parent_service_id?: string | undefined;
    linked_application_ids?: string[] | undefined;
}, {
    department?: string | undefined;
    status?: "active" | "inactive" | "deprecated" | "planned" | undefined;
    description?: string | undefined;
    name?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    business_owner?: string | undefined;
    technical_owner?: string | undefined;
    linked_asset_ids?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, unknown> | undefined;
    service_type?: "external" | "core" | "supporting" | "management" | undefined;
    sla_target_uptime?: number | undefined;
    rto_hours?: number | undefined;
    rpo_hours?: number | undefined;
    parent_service_id?: string | undefined;
    linked_application_ids?: string[] | undefined;
}>;
export declare const listBusinessServicesQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodString>;
} & {
    service_type: z.ZodOptional<z.ZodString>;
    criticality: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    department?: string | undefined;
    status?: string | undefined;
    sortBy?: string | undefined;
    pageSize?: number | undefined;
    criticality?: string | undefined;
    service_type?: string | undefined;
}, {
    department?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    criticality?: string | undefined;
    service_type?: string | undefined;
}>;
export declare const createDependencyBody: z.ZodObject<{
    source_type: z.ZodEnum<["asset", "application", "service"]>;
    source_id: z.ZodString;
    target_type: z.ZodEnum<["asset", "application", "service"]>;
    target_id: z.ZodString;
    dependency_type: z.ZodDefault<z.ZodEnum<["runs_on", "connects_to", "depends_on", "feeds_data_to", "authenticates_via", "backed_by"]>>;
    criticality: z.ZodDefault<z.ZodEnum<["critical", "high", "medium", "low"]>>;
    direction: z.ZodDefault<z.ZodEnum<["outbound", "inbound", "bidirectional"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    criticality: "high" | "critical" | "medium" | "low";
    source_type: "asset" | "service" | "application";
    source_id: string;
    target_type: "asset" | "service" | "application";
    target_id: string;
    dependency_type: "runs_on" | "connects_to" | "depends_on" | "feeds_data_to" | "authenticates_via" | "backed_by";
    direction: "outbound" | "inbound" | "bidirectional";
    notes?: string | undefined;
}, {
    source_type: "asset" | "service" | "application";
    source_id: string;
    target_type: "asset" | "service" | "application";
    target_id: string;
    notes?: string | undefined;
    criticality?: "high" | "critical" | "medium" | "low" | undefined;
    dependency_type?: "runs_on" | "connects_to" | "depends_on" | "feeds_data_to" | "authenticates_via" | "backed_by" | undefined;
    direction?: "outbound" | "inbound" | "bidirectional" | undefined;
}>;
export declare const createVendorLinkBody: z.ZodObject<{
    asset_id: z.ZodString;
    vendor_id: z.ZodString;
    link_type: z.ZodDefault<z.ZodEnum<["supplier", "manufacturer", "maintainer", "licensor"]>>;
    contract_ref: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    asset_id: string;
    vendor_id: string;
    link_type: "supplier" | "manufacturer" | "maintainer" | "licensor";
    notes?: string | undefined;
    contract_ref?: string | undefined;
}, {
    asset_id: string;
    vendor_id: string;
    notes?: string | undefined;
    link_type?: "supplier" | "manufacturer" | "maintainer" | "licensor" | undefined;
    contract_ref?: string | undefined;
}>;
export declare const createEvidenceLinkBody: z.ZodObject<{
    asset_id: z.ZodString;
    evidence_task_id: z.ZodString;
    link_type: z.ZodDefault<z.ZodEnum<["supports", "validates", "documents"]>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    asset_id: string;
    link_type: "supports" | "validates" | "documents";
    evidence_task_id: string;
    notes?: string | undefined;
}, {
    asset_id: string;
    evidence_task_id: string;
    notes?: string | undefined;
    link_type?: "supports" | "validates" | "documents" | undefined;
}>;
export declare const assignOwnerBody: z.ZodObject<{
    entity_type: z.ZodEnum<["asset", "application", "service"]>;
    entity_id: z.ZodString;
    owner_type: z.ZodEnum<["business", "technical", "custodian", "steward"]>;
    owner_user_id: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entity_type: "asset" | "service" | "application";
    entity_id: string;
    owner_type: "custodian" | "business" | "technical" | "steward";
    owner_user_id: string;
    notes?: string | undefined;
}, {
    entity_type: "asset" | "service" | "application";
    entity_id: string;
    owner_type: "custodian" | "business" | "technical" | "steward";
    owner_user_id: string;
    notes?: string | undefined;
}>;
export declare const transitionStageBody: z.ZodObject<{
    entity_type: z.ZodEnum<["asset", "application", "service"]>;
    entity_id: z.ZodString;
    to_stage: z.ZodEnum<["planning", "procurement", "deployment", "operation", "maintenance", "decommission", "disposed"]>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    entity_type: "asset" | "service" | "application";
    entity_id: string;
    to_stage: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation";
    notes?: string | undefined;
}, {
    entity_type: "asset" | "service" | "application";
    entity_id: string;
    to_stage: "maintenance" | "disposed" | "procurement" | "deployment" | "decommission" | "planning" | "operation";
    notes?: string | undefined;
}>;
export declare const createClassificationBody: z.ZodObject<{
    code: z.ZodString;
    name_en: z.ZodString;
    name_ar: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    level: z.ZodNumber;
    color: z.ZodOptional<z.ZodString>;
    handling_requirements: z.ZodOptional<z.ZodString>;
    retention_period_days: z.ZodOptional<z.ZodNumber>;
    requires_encryption: z.ZodDefault<z.ZodBoolean>;
    requires_dlp: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name_en: string;
    level: number;
    requires_encryption: boolean;
    requires_dlp: boolean;
    name_ar?: string | undefined;
    description?: string | undefined;
    color?: string | undefined;
    handling_requirements?: string | undefined;
    retention_period_days?: number | undefined;
}, {
    code: string;
    name_en: string;
    level: number;
    name_ar?: string | undefined;
    description?: string | undefined;
    color?: string | undefined;
    handling_requirements?: string | undefined;
    retention_period_days?: number | undefined;
    requires_encryption?: boolean | undefined;
    requires_dlp?: boolean | undefined;
}>;
export declare const updateClassificationBody: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name_en: z.ZodOptional<z.ZodString>;
    name_ar: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    level: z.ZodOptional<z.ZodNumber>;
    color: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    handling_requirements: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    retention_period_days: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    requires_encryption: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    requires_dlp: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name_en?: string | undefined;
    name_ar?: string | undefined;
    description?: string | undefined;
    level?: number | undefined;
    color?: string | undefined;
    handling_requirements?: string | undefined;
    retention_period_days?: number | undefined;
    requires_encryption?: boolean | undefined;
    requires_dlp?: boolean | undefined;
}, {
    code?: string | undefined;
    name_en?: string | undefined;
    name_ar?: string | undefined;
    description?: string | undefined;
    level?: number | undefined;
    color?: string | undefined;
    handling_requirements?: string | undefined;
    retention_period_days?: number | undefined;
    requires_encryption?: boolean | undefined;
    requires_dlp?: boolean | undefined;
}>;
export declare const listAssetQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    pageSize: z.ZodOptional<z.ZodNumber>;
} & {
    status: z.ZodOptional<z.ZodString>;
} & {
    type: z.ZodOptional<z.ZodString>;
    owner: z.ZodOptional<z.ZodString>;
    criticality: z.ZodOptional<z.ZodString>;
    lifecycle_stage: z.ZodOptional<z.ZodString>;
    asset_category: z.ZodOptional<z.ZodString>;
    classification: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "asc" | "desc";
    classification?: string | undefined;
    owner?: string | undefined;
    status?: string | undefined;
    sortBy?: string | undefined;
    pageSize?: number | undefined;
    type?: string | undefined;
    criticality?: string | undefined;
    asset_category?: string | undefined;
    lifecycle_stage?: string | undefined;
}, {
    classification?: string | undefined;
    owner?: string | undefined;
    status?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
    pageSize?: number | undefined;
    type?: string | undefined;
    criticality?: string | undefined;
    asset_category?: string | undefined;
    lifecycle_stage?: string | undefined;
}>;
export declare const assetResponseSchema: z.ZodObject<{
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
export declare const assetListResponseSchema: z.ZodObject<{
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
export declare const assetEventPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    entityType: z.ZodString;
    entityId: z.ZodString;
    moduleCode: z.ZodLiteral<"asset">;
    triggeredBy: z.ZodString;
    timestamp: z.ZodString;
    correlationId: z.ZodString;
    eventVersion: z.ZodNumber;
    previousState: z.ZodOptional<z.ZodString>;
    newState: z.ZodOptional<z.ZodString>;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    data: Record<string, unknown>;
    moduleCode: "asset";
    tenantId: string;
    entityType: string;
    entityId: string;
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}, {
    data: Record<string, unknown>;
    moduleCode: "asset";
    tenantId: string;
    entityType: string;
    entityId: string;
    triggeredBy: string;
    timestamp: string;
    correlationId: string;
    eventVersion: number;
    previousState?: string | undefined;
    newState?: string | undefined;
}>;
export declare const assetStatusTransitionSchema: z.ZodObject<{
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
export declare const assetImportRowSchema: z.ZodObject<{
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
export declare const assetImportBatchSchema: z.ZodObject<{
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
export declare const assetExportRequestSchema: z.ZodObject<{
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
export declare const assetAdminConfigSchema: z.ZodObject<{
    moduleCode: z.ZodLiteral<"asset">;
    autoArchiveEnabled: z.ZodDefault<z.ZodBoolean>;
    autoArchiveAfterDays: z.ZodDefault<z.ZodNumber>;
    defaultVisibility: z.ZodDefault<z.ZodEnum<["team", "department", "org", "global"]>>;
    notificationsEnabled: z.ZodDefault<z.ZodBoolean>;
    aiAssistEnabled: z.ZodDefault<z.ZodBoolean>;
    workflowEnabled: z.ZodDefault<z.ZodBoolean>;
    maxItemsPerPage: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    defaultVisibility: "org" | "team" | "department" | "global";
    moduleCode: "asset";
    autoArchiveEnabled: boolean;
    autoArchiveAfterDays: number;
    notificationsEnabled: boolean;
    aiAssistEnabled: boolean;
    workflowEnabled: boolean;
    maxItemsPerPage: number;
}, {
    moduleCode: "asset";
    defaultVisibility?: "org" | "team" | "department" | "global" | undefined;
    autoArchiveEnabled?: boolean | undefined;
    autoArchiveAfterDays?: number | undefined;
    notificationsEnabled?: boolean | undefined;
    aiAssistEnabled?: boolean | undefined;
    workflowEnabled?: boolean | undefined;
    maxItemsPerPage?: number | undefined;
}>;
export declare const assetBulkUpdateSchema: z.ZodObject<{
    ids: z.ZodArray<z.ZodString, "many">;
    update: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    update: Record<string, unknown>;
    ids: string[];
}, {
    update: Record<string, unknown>;
    ids: string[];
}>;
export declare const assetBulkStatusChangeSchema: z.ZodObject<{
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
export declare const createClassificationsBody: z.ZodObject<{
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
export declare const updateClassificationsBody: z.ZodObject<{
    title: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
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
export declare const createRecalculateCriticalityBody: z.ZodObject<{
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
export declare const createAssignBody: z.ZodObject<{
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
export declare const createRecalculateBody: z.ZodObject<{
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
export declare const createVendorsBody: z.ZodObject<{
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
export declare const createEvidenceBody: z.ZodObject<{
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
export declare const createControlsBody: z.ZodObject<{
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
export declare const createRisksBody: z.ZodObject<{
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
export declare const createTransferBody: z.ZodObject<{
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
