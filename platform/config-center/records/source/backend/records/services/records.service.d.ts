export declare function list(tenantId: string, limit?: number, offset?: number): Promise<{
    rows: import("packages/dos-types/dist").GenericRow[];
    total: number;
}>;
export declare function getById(id: string, tenantId: string): Promise<import("packages/dos-types/dist").GenericRow | null>;
export declare function create(data: Record<string, unknown>, tenantId: string): Promise<import("packages/dos-types/dist").GenericRow | null>;
export declare function update(id: string, data: Record<string, unknown>, tenantId: string): Promise<import("packages/dos-types/dist").GenericRow | null>;
export declare function remove(id: string, tenantId: string): Promise<boolean>;
