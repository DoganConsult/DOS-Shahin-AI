export interface SearchOptions {
    query: string;
    tenantId: string;
    userId?: string;
    types?: string[];
    status?: string[];
    owners?: string[];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface SearchHit {
    id: string;
    type: string;
    title: string;
    description?: string;
    status?: string;
    url?: string;
    score?: number;
    metadata?: Record<string, unknown>;
}
export interface SearchResults {
    hits: SearchHit[];
    total: number;
    limit: number;
    offset: number;
}
export interface SavedSearchRecord {
    id: string;
    name: string;
    query: string;
    filters: Record<string, unknown>;
    createdAt: string;
    userId: string;
    tenantId: string;
}
export declare function computeRetryDelay(attempt: number, baseMs?: number): number;
export interface PlatformSearch {
    search(opts: SearchOptions): Promise<SearchResults>;
    recordSearch(tenantId: string, userId: string, query: string): Promise<void>;
    getRecentSearches(tenantId: string, userId: string, limit?: number): Promise<string[]>;
    saveSearch(tenantId: string, userId: string, name: string, opts: Omit<SearchOptions, 'tenantId' | 'userId'>): Promise<SavedSearchRecord>;
    getSavedSearches(tenantId: string, userId: string): Promise<SavedSearchRecord[]>;
    deleteSavedSearch(tenantId: string, userId: string, searchId: string): Promise<void>;
}
export declare function setSearchProvider(impl: PlatformSearch): void;
export declare function search(opts: SearchOptions): Promise<SearchResults>;
export declare function recordSearch(tenantId: string, userId: string, query: string): Promise<void>;
export declare function getRecentSearches(tenantId: string, userId: string, limit?: number): Promise<string[]>;
export declare function saveSearch(tenantId: string, userId: string, name: string, opts: Omit<SearchOptions, 'tenantId' | 'userId'>): Promise<SavedSearchRecord>;
export declare function getSavedSearches(tenantId: string, userId: string): Promise<SavedSearchRecord[]>;
export declare function deleteSavedSearch(tenantId: string, userId: string, searchId: string): Promise<void>;
