export interface Organization {
    organization_id: string;
    tenant_id: string;
    name_en: string;
    name_ar: string | null;
    code: string | null;
    parent_id: string | null;
    org_type: string | null;
    status: string;
    description: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
export interface ListOrgsOptions {
    page?: number;
    pageSize?: number;
    search?: string;
}
export interface CreateOrgInput {
    name_en: string;
    name_ar?: string;
    code?: string;
    parent_id?: string;
    org_type?: string;
    status?: string;
    description?: string;
}
export type UpdateOrgInput = Partial<CreateOrgInput>;
export declare function listOrganizations(tenantId: string, opts?: ListOrgsOptions): Promise<{
    data: Organization[];
    total: number;
}>;
export declare function getOrganization(tenantId: string, id: string): Promise<Organization | null>;
export declare function createOrganization(tenantId: string, input: CreateOrgInput, actorId: string): Promise<Organization>;
export declare function updateOrganization(tenantId: string, id: string, input: UpdateOrgInput): Promise<Organization | null>;
export declare function deleteOrganization(tenantId: string, id: string): Promise<boolean>;
