export interface VectorDocument {
    id: string;
    content: string;
    embedding?: number[];
    metadata: Record<string, unknown>;
}
export interface VectorSearchResult {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
}
export declare const DEFAULT_EMBEDDING_DIM = 1536;
export declare function ensureVectorTable(tableName: string, dimensions?: number): Promise<void>;
export declare function upsertVectors(tenantId: string, tableName: string, docs: VectorDocument[]): Promise<number>;
export declare function searchVectors(tenantId: string, tableName: string, queryEmbedding: number[], topK?: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>;
export declare function deleteVectors(tenantId: string, tableName: string, ids: string[]): Promise<number>;
