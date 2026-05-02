/**
 * Local Filesystem Storage Provider
 *
 * Implements PlatformStorage for local disk storage.
 * Suitable for development and single-node deployments.
 *
 * Extracted from monolith: /home/Dr-Dogan-AGRC-OS/backend/src/platform/dos/storage/file-storage.service.ts
 *
 * Environment variables:
 *   UPLOAD_DIR — base directory for uploads (default: <cwd>/uploads)
 */
import type { PlatformStorage, FileRecord, FileUploadInput } from './storage';
export declare class LocalStorageProvider implements PlatformStorage {
    uploadFile(input: FileUploadInput): Promise<FileRecord>;
    getFile(tenantId: string, fileId: string): Promise<FileRecord | null>;
    listFiles(tenantId: string, opts?: {
        entityType?: string;
        entityId?: string;
        limit?: number;
        offset?: number;
    }): Promise<FileRecord[]>;
    deleteFile(tenantId: string, fileId: string): Promise<void>;
    /** Retrieve the raw file content from local disk by storage key */
    getFileContent(storageKey: string): Promise<Buffer>;
}
