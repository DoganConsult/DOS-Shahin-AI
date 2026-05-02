interface DimensionScore {
    dimension: string;
    score: number;
    grade: string;
    weight: number;
    details: Record<string, number>;
}
interface HealthResult {
    score_id: string;
    overall_score: number;
    overall_grade: string;
    dimensions: DimensionScore[];
    computed_at: string;
}
export declare function computeGovernanceHealth(tenantId: string): Promise<HealthResult>;
export declare function getLatestHealthScore(tenantId: string): Promise<HealthResult | null>;
export declare function getHealthHistory(tenantId: string, days?: number): Promise<Record<string, unknown>[]>;
export declare function getHealthThresholds(tenantId: string): Promise<Record<string, unknown>[]>;
export declare function updateHealthThresholds(tenantId: string, thresholds: Array<{
    dimension: string;
    green_min?: number;
    yellow_min?: number;
    weight?: number;
}>): Promise<void>;
export declare function getBoardWatchlist(tenantId: string): Promise<Record<string, unknown>[]>;
export {};
