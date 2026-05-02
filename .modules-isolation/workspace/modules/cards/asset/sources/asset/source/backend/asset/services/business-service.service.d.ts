interface ListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    service_type?: string;
    criticality?: string;
    status?: string;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}
interface CreateServiceInput {
    name: string;
    name_en?: string;
    name_ar?: string;
    description?: string;
    service_type?: string;
    business_owner?: string;
    technical_owner?: string;
    department?: string;
    criticality?: string;
    status?: string;
    sla_target_uptime?: number;
    rto_hours?: number;
    rpo_hours?: number;
    parent_service_id?: string;
    linked_application_ids?: string[];
    linked_asset_ids?: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export declare function listBusinessServices(tenantId: string, params?: ListParams): Promise<{
    data: any[];
    page: number;
    pageSize: number;
    total: any;
    totalPages: number;
}>;
export declare function getBusinessServiceById(tenantId: string, id: string): Promise<any>;
export declare function getServiceHierarchy(tenantId: string, rootId?: string): Promise<any[]>;
export declare function createBusinessService(tenantId: string, userId: string, input: CreateServiceInput): Promise<any>;
export declare function updateBusinessService(tenantId: string, userId: string, id: string, updates: Partial<CreateServiceInput>): Promise<any>;
export declare function deleteBusinessService(tenantId: string, userId: string, id: string): Promise<any>;
export declare function getServiceStats(tenantId: string): Promise<any>;
export {};
