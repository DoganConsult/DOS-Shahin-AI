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

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function validateFileSize(sizeBytes: number, maxBytes = MAX_FILE_SIZE): boolean {
  return sizeBytes > 0 && sizeBytes <= maxBytes;
}

export interface PlatformStorage {
  uploadFile(input: FileUploadInput): Promise<FileRecord>;
  getFile(tenantId: string, fileId: string): Promise<FileRecord | null>;
  listFiles(tenantId: string, opts?: { entityType?: string; entityId?: string; limit?: number; offset?: number }): Promise<FileRecord[]>;
  deleteFile(tenantId: string, fileId: string): Promise<void>;
}

let _storage: PlatformStorage | null = null;

export function setStorageProvider(impl: PlatformStorage): void {
  _storage = impl;
}

function getStorage(): PlatformStorage {
  if (!_storage) {
    throw new Error('PlatformStorage not initialized. Call setStorageProvider() first.');
  }
  return _storage;
}

export function uploadFile(input: FileUploadInput): Promise<FileRecord> {
  return getStorage().uploadFile(input);
}

export function getFile(tenantId: string, fileId: string): Promise<FileRecord | null> {
  return getStorage().getFile(tenantId, fileId);
}

export function listFiles(tenantId: string, opts?: { entityType?: string; entityId?: string; limit?: number; offset?: number }): Promise<FileRecord[]> {
  return getStorage().listFiles(tenantId, opts);
}

export function deleteFile(tenantId: string, fileId: string): Promise<void> {
  return getStorage().deleteFile(tenantId, fileId);
}

// ── Provider Exports ─────────────────────────────────────────────────────────
export { S3StorageProvider } from './s3-storage-provider';
export { LocalStorageProvider } from './local-storage-provider';

/**
 * Create and register a storage provider based on the STORAGE_PROVIDER env var.
 * Call once during service bootstrap.
 */
export function initStorageFromEnv(): PlatformStorage {
  const provider = process.env.STORAGE_PROVIDER || 'local';
  let impl: PlatformStorage;

  switch (provider) {
    case 's3': {
      const { S3StorageProvider } = require('./s3-storage-provider');
      impl = new S3StorageProvider();
      break;
    }
    default: {
      const { LocalStorageProvider } = require('./local-storage-provider');
      impl = new LocalStorageProvider();
    }
  }

  setStorageProvider(impl);
  return impl;
}
