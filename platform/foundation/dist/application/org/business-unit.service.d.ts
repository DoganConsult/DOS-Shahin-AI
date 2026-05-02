export declare function getBusinessUnits(tenantId: string): Promise<{
    count: number;
    rows: any[];
}>;
export declare function getBusinessUnitById(tenantId: string, buId: string): Promise<any | null>;
export declare function createBusinessUnit(tenantId: string, payload: any): Promise<any>;
export declare function updateBusinessUnit(tenantId: string, buId: string, payload: any): Promise<any | null>;
export declare function deleteBusinessUnit(tenantId: string, buId: string): Promise<{
    deleted: boolean;
    linkedDepartments: number;
}>;
