interface ListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    app_type?: string;
    criticality?: string;
    status?: string;
    environment?: string;
    hosting_type?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}
interface CreateAppInput {
    name: string;
    name_en?: string;
    name_ar?: string;
    app_type?: string;
    vendor?: string;
    version?: string;
    environment?: string;
    business_owner?: string;
    technical_owner?: string;
    department?: string;
    criticality?: string;
    status?: string;
    hosting_type?: string;
    hosting_provider?: string;
    url?: string;
    data_classification?: string;
    compliance_status?: string;
    license_type?: string;
    license_expiry?: string;
    linked_asset_ids?: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export declare function listApplications(tenantId: string, params?: ListParams): Promise<{
    data: any[];
    page: number;
    pageSize: number;
    total: any;
    totalPages: number;
}>;
export declare function getApplicationById(tenantId: string, id: string): Promise<any>;
export declare function createApplication(tenantId: string, userId: string, input: CreateAppInput): Promise<any>;
export declare function updateApplication(tenantId: string, userId: string, id: string, updates: Partial<CreateAppInput>): Promise<any>;
export declare function deleteApplication(tenantId: string, userId: string, id: string): Promise<any>;
export declare function getApplicationStats(tenantId: string): Promise<any>;
export {};
