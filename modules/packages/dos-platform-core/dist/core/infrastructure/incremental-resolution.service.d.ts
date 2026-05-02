export declare function addSectorToTenant(tenantId: string, sectorCode: string, userId?: string): Promise<{
    tenantId: string;
    sectorCode: string;
    sectors: string[];
    added: boolean;
    updatedBy?: string;
}>;
export declare function removeSectorFromTenant(tenantId: string, sectorCode: string): Promise<{
    tenantId: string;
    removed: boolean;
    sectors: string[];
}>;
