export interface BusinessUnit {
    bu_id: string;
    tenant_id: string;
    name_en: string;
    name_ar: string | null;
    code: string | null;
    organization_id: string | null;
    parent_bu_id: string | null;
    bu_type: string | null;
    status: string;
    description: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}
export interface ListBUOptions {
    page?: number;
    pageSize?: number;
    organization_id?: string;
    search?: string;
}
export interface CreateBUInput {
    name_en: string;
    name_ar?: string;
    code?: string;
    organization_id?: string;
    parent_bu_id?: string;
    bu_type?: string;
    status?: string;
    description?: string;
}
export type UpdateBUInput = Partial<CreateBUInput>;
export declare function listBusinessUnits(tenantId: string, opts?: ListBUOptions): Promise<{
    data: BusinessUnit[];
    total: number;
}>;
export declare function getBusinessUnit(tenantId: string, id: string): Promise<BusinessUnit | null>;
export declare function createBusinessUnit(tenantId: string, input: CreateBUInput, actorId: string): Promise<BusinessUnit>;
export declare function updateBusinessUnit(tenantId: string, id: string, input: UpdateBUInput): Promise<BusinessUnit | null>;
export declare function deleteBusinessUnit(tenantId: string, id: string): Promise<boolean>;
