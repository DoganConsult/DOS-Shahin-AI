export interface FileRecord {
    fileId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    url?: string;
    uploadedAt: string;
    uploadedBy?: string;
    tenantId: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
}
export interface FileUploadInput {
    tenantId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    content: Buffer | string;
    uploadedBy?: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
}
export declare const MAX_FILE_SIZE: number;
export declare function validateFileSize(sizeBytes: number, maxBytes?: number): boolean;
export interface PlatformStorage {
    uploadFile(input: FileUploadInput): Promise<FileRecord>;
    getFile(tenantId: string, fileId: string): Promise<FileRecord | null>;
    listFiles(tenantId: string, opts?: {
        entityType?: string;
        entityId?: string;
        limit?: number;
        offset?: number;
    }): Promise<FileRecord[]>;
    deleteFile(tenantId: string, fileId: string): Promise<void>;
}
export declare function setStorageProvider(impl: PlatformStorage): void;
export declare function uploadFile(input: FileUploadInput): Promise<FileRecord>;
export declare function getFile(tenantId: string, fileId: string): Promise<FileRecord | null>;
export declare function listFiles(tenantId: string, opts?: {
    entityType?: string;
    entityId?: string;
    limit?: number;
    offset?: number;
}): Promise<FileRecord[]>;
export declare function deleteFile(tenantId: string, fileId: string): Promise<void>;
export { S3StorageProvider } from './s3-storage-provider';
export { LocalStorageProvider } from './local-storage-provider';
/**
 * Create and register a storage provider based on the STORAGE_PROVIDER env var.
 * Call once during service bootstrap.
 */
export declare function initStorageFromEnv(): PlatformStorage;
