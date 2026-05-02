export declare function getOrganizations(tenantId: string): Promise<{
    count: number;
    rows: any[];
}>;
export declare function getOrganizationBusinessUnits(tenantId: string, orgId: string): Promise<{
    count: number;
    rows: any[];
}>;
export declare function getOrganizationById(tenantId: string, orgId: string): Promise<any | null>;
export declare function createOrganization(tenantId: string, payload: any): Promise<any>;
export declare function updateOrganization(tenantId: string, orgId: string, payload: any): Promise<any | null>;
export declare function deleteOrganization(tenantId: string, orgId: string): Promise<{
    deleted: boolean;
    linkedBusinessUnits: number;
}>;
