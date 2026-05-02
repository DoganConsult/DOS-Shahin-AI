/**
 * S3 Storage Provider
 *
 * Implements PlatformStorage for AWS S3 / S3-compatible object stores.
 * Uses native fetch (no AWS SDK dependency) for PUT/GET operations.
 *
 * Extracted from monolith: /home/Dr-Dogan-AGRC-OS/backend/src/platform/dos/storage/file-storage.service.ts
 *
 * Environment variables:
 *   S3_BUCKET        — bucket name (required)
 *   S3_REGION        — AWS region (default: me-south-1)
 *   S3_ACCESS_KEY    — access key ID
 *   S3_SECRET_KEY    — secret access key
 *   S3_ENDPOINT      — custom endpoint for S3-compatible stores (e.g. MinIO)
 */
import type { PlatformStorage, FileRecord, FileUploadInput } from './storage';
export declare class S3StorageProvider implements PlatformStorage {
    uploadFile(input: FileUploadInput): Promise<FileRecord>;
    getFile(tenantId: string, fileId: string): Promise<FileRecord | null>;
    listFiles(tenantId: string, opts?: {
        entityType?: string;
        entityId?: string;
        limit?: number;
        offset?: number;
    }): Promise<FileRecord[]>;
    deleteFile(tenantId: string, fileId: string): Promise<void>;
    /** Retrieve the raw file content from S3 by storage key */
    getFileContent(storageKey: string): Promise<Buffer>;
}
