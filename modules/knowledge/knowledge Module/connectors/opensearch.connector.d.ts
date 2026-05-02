export interface SearchHit {
    _index: string;
    _id: string;
    _score: number;
    _source: Record<string, unknown>;
}
export interface SearchResponse {
    hits: {
        total: {
            value: number;
            relation: string;
        };
        hits: SearchHit[];
    };
    took: number;
}
export declare function search(index: string, query: Record<string, unknown>, options?: {
    size?: number;
    from?: number;
    sort?: Record<string, unknown>[];
}): Promise<SearchResponse>;
export declare function createIndex(index: string, settings?: Record<string, unknown>, mappings?: Record<string, unknown>): Promise<{
    acknowledged: boolean;
    index: string;
}>;
export declare function bulkIndex(index: string, documents: Array<{
    id?: string;
    document: Record<string, unknown>;
}>): Promise<{
    errors: boolean;
    items: unknown[];
}>;
export declare function indexDocument(index: string, id: string, document: Record<string, unknown>): Promise<{
    _id: string;
    result: string;
}>;
export declare function deleteDocument(index: string, id: string): Promise<{
    _id: string;
    result: string;
}>;
