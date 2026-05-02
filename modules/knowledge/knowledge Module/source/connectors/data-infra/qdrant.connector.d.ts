export interface QdrantScoredPoint {
    id: string | number;
    version: number;
    score: number;
    payload?: Record<string, unknown>;
    vector?: number[];
}
export interface SearchPointsOptions {
    collection: string;
    vector: number[];
    limit?: number;
    offset?: number;
    filter?: Record<string, unknown>;
    withPayload?: boolean;
    withVector?: boolean;
    scoreThreshold?: number;
    params?: Record<string, unknown>;
}
export declare function searchPoints(options: SearchPointsOptions): Promise<QdrantScoredPoint[]>;
