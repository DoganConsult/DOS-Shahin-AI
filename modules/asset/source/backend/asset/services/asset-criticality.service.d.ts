interface CriticalityResult {
    asset_id: string;
    name: string;
    cia_confidentiality: number;
    cia_integrity: number;
    cia_availability: number;
    cia_composite: number;
    dependency_fan_out: number;
    linked_risk_score: number;
    final_score: number;
    criticality_label: string;
}
export declare function computeCriticality(tenantId: string, assetId: string): Promise<CriticalityResult | null>;
export declare function bulkComputeCriticality(tenantId: string): Promise<CriticalityResult[]>;
export declare function getCriticalAssets(tenantId: string, page?: number, pageSize?: number): Promise<{
    data: any[];
    page: number;
    pageSize: number;
    total: any;
    totalPages: number;
}>;
export {};
