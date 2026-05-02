export interface GrcQueryRequestContract {
    queryDslJson: Record<string, unknown>;
    modules?: string[];
    limit?: number;
    offset?: number;
}
export interface GrcQueryResultContract {
    results: Record<string, unknown>[];
    totalHits: number;
    executionTimeMs: number;
    moduleHits: Record<string, number>;
}
export interface GrcSavedQueryContract {
    queryId: string;
    userId: string;
    name: string;
    queryDslJson: Record<string, unknown>;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface GrcQueryLogContract {
    queryHash: string;
    userId: string;
    executionTimeMs: number;
    moduleHits: Record<string, unknown>;
    dslQuery: Record<string, unknown> | null;
    nlqPrompt: string | null;
    createdAt: string;
}
