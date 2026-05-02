"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageProvider = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const uuid_1 = require("uuid");
const db_1 = require("@dos/db");
const storage_1 = require("./storage");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
function computeHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
function guessMimeType(ext) {
    const map = {
        '.pdf': 'application/pdf', '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.csv': 'text/csv', '.txt': 'text/plain', '.json': 'application/json',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.zip': 'application/zip',
        '.xml': 'application/xml', '.html': 'text/html',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
}
function rowToFileRecord(row) {
    return {
        fileId: row.file_id,
        fileName: row.original_filename,
        mimeType: row.content_type || 'application/octet-stream',
        sizeBytes: row.file_size_bytes,
        uploadedAt: row.created_at,
        uploadedBy: row.uploaded_by,
        tenantId: row.tenant_id || '',
        entityType: row.entity_type,
        entityId: row.entity_id,
        metadata: { storageKey: row.storage_key, contentHash: row.content_hash },
    };
}
class LocalStorageProvider {
    async uploadFile(input) {
        if (!(0, storage_1.validateFileSize)(input.sizeBytes)) {
            throw new Error(`File size ${input.sizeBytes} exceeds maximum allowed`);
        }
        const buffer = Buffer.isBuffer(input.content) ? input.content : Buffer.from(input.content);
        const ext = path.extname(input.fileName);
        const contentHash = computeHash(buffer);
        const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const storageKey = `${datePrefix}/${(0, uuid_1.v4)()}${ext}`;
        const contentType = input.mimeType || guessMimeType(ext);
        // Store to local filesystem
        const fullPath = path.join(UPLOAD_DIR, storageKey);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, buffer);
        // Track in DB
        const schema = (0, db_1.tenantSchema)(input.tenantId);
        const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".file_storage
         (original_filename, storage_provider, storage_key, storage_bucket, content_type,
          file_size_bytes, content_hash, entity_type, entity_id, uploaded_by, access_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`, [
            input.fileName, 'local', storageKey, null, contentType,
            buffer.length, contentHash,
            input.entityType || null, input.entityId || null,
            input.uploadedBy || 'system', 'private',
        ]);
        const row = result.rows[0];
        if (row)
            return rowToFileRecord({ ...row, tenant_id: input.tenantId });
        return {
            fileId: (0, uuid_1.v4)(),
            fileName: input.fileName,
            mimeType: contentType,
            sizeBytes: buffer.length,
            uploadedAt: new Date().toISOString(),
            uploadedBy: input.uploadedBy,
            tenantId: input.tenantId,
            entityType: input.entityType,
            entityId: input.entityId,
            metadata: { storageKey, contentHash },
        };
    }
    async getFile(tenantId, fileId) {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".file_storage WHERE file_id = $1 AND deleted_at IS NULL`, [fileId]);
        if (result.rows.length === 0)
            return null;
        return rowToFileRecord({ ...result.rows[0], tenant_id: tenantId });
    }
    async listFiles(tenantId, opts) {
        const schema = (0, db_1.tenantSchema)(tenantId);
        const conditions = ['deleted_at IS NULL'];
        const params = [];
        let paramIdx = 1;
        if (opts?.entityType) {
            conditions.push(`entity_type = $${paramIdx++}`);
            params.push(opts.entityType);
        }
        if (opts?.entityId) {
            conditions.push(`entity_id = $${paramIdx++}`);
            params.push(opts.entityId);
        }
        const limit = opts?.limit || 100;
        const offset = opts?.offset || 0;
        const result = await (0, db_1.safeQuery)(`SELECT * FROM "${schema}".file_storage
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`, params);
        return result.rows.map((row) => rowToFileRecord({ ...row, tenant_id: tenantId }));
    }
    async deleteFile(tenantId, fileId) {
        const schema = (0, db_1.tenantSchema)(tenantId);
        // Soft-delete in DB
        await (0, db_1.safeQuery)(`UPDATE "${schema}".file_storage SET deleted_at = NOW() WHERE file_id = $1`, [fileId]);
    }
    /** Retrieve the raw file content from local disk by storage key */
    async getFileContent(storageKey) {
        const fullPath = path.join(UPLOAD_DIR, storageKey);
        if (!fs.existsSync(fullPath))
            throw new Error(`File not found: ${storageKey}`);
        return fs.readFileSync(fullPath);
    }
}
exports.LocalStorageProvider = LocalStorageProvider;
//# sourceMappingURL=local-storage-provider.js.map