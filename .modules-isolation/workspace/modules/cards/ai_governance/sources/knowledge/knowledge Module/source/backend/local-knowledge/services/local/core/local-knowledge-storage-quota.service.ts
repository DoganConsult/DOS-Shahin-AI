// ============================================
// Shahin-Ai — Local Knowledge Storage Quota Service
// R3.3B Phase G+: Manages storage quotas and usage tracking
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import {
  getCachedResult,
  setCachedResult,
  invalidateCache,
} from './local-knowledge-cache.service';

async function getCachedStorageQuota(tenantId: string): Promise<unknown> {
  return getCachedResult(tenantId, 'storage_quota');
}
async function cacheStorageQuota(tenantId: string, data: unknown): Promise<void> {
  await setCachedResult(tenantId, 'storage_quota', data);
}
async function invalidateStorageQuotaCache(tenantId: string): Promise<void> {
  await invalidateCache(tenantId);
}

export interface StorageQuota {
  quotaId: string;
  tenantId: string;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  lastCalculatedAt: string;
  alertThreshold80: boolean;
  alertThreshold90: boolean;
  alertThreshold100: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaCheckResult {
  withinQuota: boolean;
  usagePercent: number;
  remainingBytes: number;
  alertLevel?: '80' | '90' | '100';
}

/**
 * Get or create storage quota for a tenant
 */
export async function getStorageQuota(tenantId: string): Promise<StorageQuota> {
  // Try cache first
  const cached = await getCachedStorageQuota(tenantId);
  if (cached) {
    return cached as StorageQuota;
  }

  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `SELECT quota_id, tenant_id, storage_quota_bytes, storage_used_bytes, last_calculated_at,
              alert_threshold_80, alert_threshold_90, alert_threshold_100, created_at, updated_at
       FROM "${schema}".local_knowledge_storage_quota
       WHERE tenant_id = $1`,
      [tenantId],
    );

    let quota: StorageQuota;

    if (res.rows.length > 0) {
      const row = res.rows[0];
      quota = {
        quotaId: row.quota_id,
        tenantId: row.tenant_id,
        storageQuotaBytes: parseInt(row.storage_quota_bytes) || 10737418240, // 10GB default
        storageUsedBytes: parseInt(row.storage_used_bytes) || 0,
        lastCalculatedAt: row.last_calculated_at,
        alertThreshold80: row.alert_threshold_80 || false,
        alertThreshold90: row.alert_threshold_90 || false,
        alertThreshold100: row.alert_threshold_100 || false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } else {
      // Create default quota if not exists
      const defaultQuota = 10737418240; // 10GB
      const insertRes = await safeQuery(
        `INSERT INTO "${schema}".local_knowledge_storage_quota
           (tenant_id, storage_quota_bytes, storage_used_bytes, last_calculated_at, created_at, updated_at)
         VALUES ($1, $2, 0, NOW(), NOW(), NOW())
         RETURNING *`,
        [tenantId, defaultQuota],
      );

      const row = insertRes.rows[0];
      quota = {
        quotaId: row.quota_id,
        tenantId: row.tenant_id,
        storageQuotaBytes: parseInt(row.storage_quota_bytes),
        storageUsedBytes: 0,
        lastCalculatedAt: row.last_calculated_at,
        alertThreshold80: false,
        alertThreshold90: false,
        alertThreshold100: false,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    // Cache the result
    await cacheStorageQuota(tenantId, quota);

    return quota;
  } catch (err) {
    logger.error('[LocalKnowledgeStorageQuota] Failed to get storage quota', {
      tenantId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Calculate current storage usage for a tenant
 */
export async function calculateStorageUsage(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    // Sum file sizes from ingestion log (raw content storage)
    const res = await safeQuery(
      `SELECT COALESCE(SUM(file_size_bytes), 0) as total_bytes
       FROM "${schema}".file_storage
       WHERE tenant_id = $1
         AND entity_type = 'local_knowledge'
         AND deleted_at IS NULL`,
      [tenantId],
    );

    const totalBytes = parseInt(res.rows[0]?.total_bytes || '0');
    return totalBytes;
  } catch (err) {
    logger.error('[LocalKnowledgeStorageQuota] Failed to calculate storage usage', {
      tenantId,
      error: (err as Error).message,
    });
    return 0;
  }
}

/**
 * Update storage usage and check quota
 */
export async function updateStorageUsage(tenantId: string): Promise<QuotaCheckResult> {
  const schema = tenantSchema(tenantId);

  try {
    const usedBytes = await calculateStorageUsage(tenantId);
    const quota = await getStorageQuota(tenantId);

    const usagePercent = (usedBytes / quota.storageQuotaBytes) * 100;
    const remainingBytes = quota.storageQuotaBytes - usedBytes;
    const withinQuota = usedBytes < quota.storageQuotaBytes;

    // Determine alert level
    let alertLevel: '80' | '90' | '100' | undefined;
    let alertThreshold80 = false;
    let alertThreshold90 = false;
    let alertThreshold100 = false;

    if (usagePercent >= 100) {
      alertLevel = '100';
      alertThreshold100 = true;
    } else if (usagePercent >= 90) {
      alertLevel = '90';
      alertThreshold90 = true;
    } else if (usagePercent >= 80) {
      alertLevel = '80';
      alertThreshold80 = true;
    }

    // Update quota record
    await safeQuery(
      `UPDATE "${schema}".local_knowledge_storage_quota
       SET storage_used_bytes = $1,
           last_calculated_at = NOW(),
           alert_threshold_80 = $2,
           alert_threshold_90 = $3,
           alert_threshold_100 = $4,
           updated_at = NOW()
       WHERE tenant_id = $5`,
      [usedBytes, alertThreshold80, alertThreshold90, alertThreshold100, tenantId],
    );

    // Invalidate cache
    await invalidateStorageQuotaCache(tenantId);

    return {
      withinQuota,
      usagePercent,
      remainingBytes,
      alertLevel,
    };
  } catch (err) {
    logger.error('[LocalKnowledgeStorageQuota] Failed to update storage usage', {
      tenantId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Check if tenant can ingest more content (quota check)
 */
export async function checkQuotaBeforeIngestion(
  tenantId: string,
  estimatedBytes: number,
): Promise<{ allowed: boolean; reason?: string; currentUsage: number; quota: number }> {
  const quota = await getStorageQuota(tenantId);
  const currentUsage = await calculateStorageUsage(tenantId);
  const projectedUsage = currentUsage + estimatedBytes;

  if (projectedUsage > quota.storageQuotaBytes) {
    return {
      allowed: false,
      reason: `Ingestion would exceed storage quota. Current: ${(currentUsage / 1024 / 1024).toFixed(2)}MB, Quota: ${(quota.storageQuotaBytes / 1024 / 1024).toFixed(2)}MB`,
      currentUsage,
      quota: quota.storageQuotaBytes,
    };
  }

  return {
    allowed: true,
    currentUsage,
    quota: quota.storageQuotaBytes,
  };
}

/**
 * Set storage quota for a tenant
 */
export async function setStorageQuota(
  tenantId: string,
  quotaBytes: number,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `INSERT INTO "${schema}".local_knowledge_storage_quota
         (tenant_id, storage_quota_bytes, storage_used_bytes, last_calculated_at, created_at, updated_at)
       VALUES ($1, $2, 0, NOW(), NOW(), NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         storage_quota_bytes = $2,
         updated_at = NOW()`,
      [tenantId, quotaBytes],
    );

    // Invalidate cache
    await invalidateStorageQuotaCache(tenantId);

    logger.info('[LocalKnowledgeStorageQuota] Storage quota set', {
      tenantId,
      quotaBytes,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeStorageQuota] Failed to set storage quota', {
      tenantId,
      error: (err as Error).message,
    });
    throw err;
  }
}
