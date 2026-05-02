export declare function getDepartments(tenantId: string): Promise<{
    count: number;
    rows: any[];
}>;
export declare function getDepartmentById(tenantId: string, deptId: string): Promise<any | null>;
export declare function createDepartment(tenantId: string, payload: any): Promise<any>;
export declare function updateDepartment(tenantId: string, deptId: string, payload: any): Promise<any | null>;
export declare function deleteDepartment(tenantId: string, deptId: string): Promise<{
    deleted: boolean;
}>;
