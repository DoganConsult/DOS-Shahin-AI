"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = exports.S3StorageProvider = exports.MAX_FILE_SIZE = void 0;
exports.validateFileSize = validateFileSize;
exports.setStorageProvider = setStorageProvider;
exports.uploadFile = uploadFile;
exports.getFile = getFile;
exports.listFiles = listFiles;
exports.deleteFile = deleteFile;
exports.initStorageFromEnv = initStorageFromEnv;
exports.MAX_FILE_SIZE = 50 * 1024 * 1024;
function validateFileSize(sizeBytes, maxBytes = exports.MAX_FILE_SIZE) {
    return sizeBytes > 0 && sizeBytes <= maxBytes;
}
let _storage = null;
function setStorageProvider(impl) {
    _storage = impl;
}
function getStorage() {
    if (!_storage) {
        throw new Error('PlatformStorage not initialized. Call setStorageProvider() first.');
    }
    return _storage;
}
function uploadFile(input) {
    return getStorage().uploadFile(input);
}
function getFile(tenantId, fileId) {
    return getStorage().getFile(tenantId, fileId);
}
function listFiles(tenantId, opts) {
    return getStorage().listFiles(tenantId, opts);
}
function deleteFile(tenantId, fileId) {
    return getStorage().deleteFile(tenantId, fileId);
}
// ── Provider Exports ─────────────────────────────────────────────────────────
var s3_storage_provider_1 = require("./s3-storage-provider");
Object.defineProperty(exports, "S3StorageProvider", { enumerable: true, get: function () { return s3_storage_provider_1.S3StorageProvider; } });
var local_storage_provider_1 = require("./local-storage-provider");
Object.defineProperty(exports, "LocalStorageProvider", { enumerable: true, get: function () { return local_storage_provider_1.LocalStorageProvider; } });
/**
 * Create and register a storage provider based on the STORAGE_PROVIDER env var.
 * Call once during service bootstrap.
 */
function initStorageFromEnv() {
    const provider = process.env.STORAGE_PROVIDER || 'local';
    let impl;
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
//# sourceMappingURL=storage.js.map