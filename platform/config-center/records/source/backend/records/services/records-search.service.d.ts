export interface SearchFilters {
    query?: string;
    recordType?: string;
    classification?: string;
    status?: string;
    tags?: string[];
    createdAfter?: string;
    createdBefore?: string;
    legalHold?: boolean;
    metadata?: Record<string, unknown>;
}
export interface SearchResult {
    id: string;
    title: string;
    description: string;
    recordType: string;
    classification: string;
    status: string;
    tags: string[];
    relevanceScore: number;
    createdAt: string;
    updatedAt: string;
}
export interface SavedSearch {
    savedSearchId: string;
    userId: string;
    name: string;
    filters: SearchFilters;
    createdAt: string;
    lastRunAt: string | null;
    resultCount: number | null;
}
export interface CrossModuleResult {
    source: string;
    id: string;
    title: string;
    status: string;
    createdAt: string;
}
export declare function buildTextSearchCondition(query: string, idx: number): {
    clause: string;
    value: string;
};
export declare function buildFilterConditions(filters: SearchFilters, startIdx: number): {
    conditions: string[];
    params: unknown[];
    nextIdx: number;
};
export declare function searchRecords(tenantId: string, filters: SearchFilters, limit?: number, offset?: number): Promise<{
    results: SearchResult[];
    total: number;
}>;
export declare function searchByMetadata(tenantId: string, metadataKey: string, metadataValue: unknown): Promise<SearchResult[]>;
export declare function crossModuleDiscovery(tenantId: string, query: string): Promise<CrossModuleResult[]>;
export declare function saveSearch(tenantId: string, userId: string, name: string, filters: SearchFilters): Promise<SavedSearch>;
export declare function runSavedSearch(tenantId: string, savedSearchId: string, userId: string): Promise<{
    results: SearchResult[];
    total: number;
}>;
