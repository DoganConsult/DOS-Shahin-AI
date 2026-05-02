type GenericRow = Record<string, unknown>;
// ============================================
// Shahin-Ai — Local Knowledge Retention Service
// R3.3B Phase G: Manages retention policies, versioning, and archiving
// ============================================

import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

export interface RetentionPolicy {
  sourceType: string;
  retentionDays: number; // Days to keep active versions
  archiveAfterDays: number; // Days before archiving old versions
  maxVersions: number; // Maximum versions to keep per document
}

export interface ComplianceRetentionRule {
  framework?: string;
  regulator?: string;
  documentType?: string;
  retentionDays: number;
  legalHoldRequired?: boolean;
  archiveAfterDays?: number;
}

// Default retention policies per source type
const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  { sourceType: 'local_folder', retentionDays: 365, archiveAfterDays: 90, maxVersions: 10 },
  { sourceType: 'sftp', retentionDays: 365, archiveAfterDays: 90, maxVersions: 10 },
  { sourceType: 'local_db', retentionDays: 730, archiveAfterDays: 180, maxVersions: 5 },
  { sourceType: 'local_api', retentionDays: 180, archiveAfterDays: 60, maxVersions: 20 },
  { sourceType: 'system_export', retentionDays: 1095, archiveAfterDays: 365, maxVersions: 3 },
  { sourceType: 'sharepoint_local', retentionDays: 365, archiveAfterDays: 90, maxVersions: 10 },
];

/**
 * Get retention policy for a source type
 */
export function getRetentionPolicy(sourceType: string): RetentionPolicy {
  return DEFAULT_RETENTION_POLICIES.find(p => p.sourceType === sourceType) || {
    sourceType: 'default',
    retentionDays: 365,
    archiveAfterDays: 90,
    maxVersions: 10,
  };
}

/**
 * Archive old document versions based on retention policy
 */
export async function archiveOldVersions(
  tenantId: string,
  sourceType: string,
): Promise<{ archived: number; errors: number }> {
  const _schema = tenantSchema(tenantId);
  const policy = getRetentionPolicy(sourceType);
  const archiveThreshold = new Date();
  archiveThreshold.setDate(archiveThreshold.getDate() - policy.archiveAfterDays);

  let archived = 0;
  let errors = 0;

  try {
    // Find documents that should be archived
    const res = await LocalKnowledgeAutoRepo.query144(tenantSchema(tenantId), [tenantId, sourceType, archiveThreshold.toISOString()]);

    // Group by document_id and keep only maxVersions per document
    const documentGroups = new Map<string, GenericRow[]>();
    for (const row of res.rows) {
      const docId = row.document_id;
      if (!documentGroups.has(docId)) {
        documentGroups.set(docId, []);
      }
      documentGroups.get(docId)!.push(row);
    }

    // Archive excess versions
    for (const [docId, versions] of documentGroups.entries()) {

      const sortedVersions = versions.sort((a, b) => b.version - a.version);
      const toArchive = sortedVersions.slice(policy.maxVersions);

      for (const version of toArchive) {
        try {
          await LocalKnowledgeAutoRepo.query143(tenantSchema(tenantId), [docId, version.version, tenantId]);
          archived++;
        } catch (err) {
          logger.warn('[LocalKnowledgeRetention] Failed to archive version', {
            tenantId,
            documentId: docId,
            version: version.version,
            error: (err as Error).message,
          });
          errors++;
        }
      }
    }

    logger.info('[LocalKnowledgeRetention] Archive completed', {
      tenantId,
      sourceType,
      archived,
      errors,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeRetention] Archive failed', {
      tenantId,
      sourceType,
      error: (err as Error).message,
    });
    errors++;
  }

  return { archived, errors };
}

/**
 * Clean up expired archived documents (beyond retention period)
 */
export async function cleanupExpiredArchives(
  tenantId: string,
  sourceType: string,
): Promise<{ deleted: number; errors: number }> {
  const _schema = tenantSchema(tenantId);
  const policy = getRetentionPolicy(sourceType);
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() - policy.retentionDays);

  let deleted = 0;
  let errors = 0;

  try {
    // Find archived documents beyond retention period
    // EXCLUDE documents under legal hold
    const res = await LocalKnowledgeAutoRepo.query142(tenantSchema(tenantId), [tenantId, sourceType, expiryThreshold.toISOString()]);

    // Delete expired archives (cascade will handle chunks)
    // Skip documents under legal hold
    for (const row of res.rows) {
      try {
        // Double-check legal hold before deletion
        const legalHoldCheck = await LocalKnowledgeAutoRepo.query141(tenantSchema(tenantId), [row.document_id, tenantId]);
        if (legalHoldCheck.rows.length > 0 && legalHoldCheck.rows[0].legal_hold) {
          logger.info('[LocalKnowledgeRetention] Skipping deletion due to legal hold', {
            tenantId,
            documentId: row.document_id,
          });
          continue;
        }

        await LocalKnowledgeAutoRepo.query140(tenantSchema(tenantId), [row.document_id, tenantId]);
        deleted++;
      } catch (err) {
        logger.warn('[LocalKnowledgeRetention] Failed to delete expired archive', {
          tenantId,
          documentId: row.document_id,
          error: (err as Error).message,
        });
        errors++;
      }
    }

    logger.info('[LocalKnowledgeRetention] Cleanup completed', {
      tenantId,
      sourceType,
      deleted,
      errors,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeRetention] Cleanup failed', {
      tenantId,
      sourceType,
      error: (err as Error).message,
    });
    errors++;
  }

  return { deleted, errors };
}

/**
 * Get compliance-driven retention rule for a document
 */
export async function getComplianceRetentionRule(
  tenantId: string,
  documentId: string,
): Promise<ComplianceRetentionRule | null> {
  const _schema = tenantSchema(tenantId);

  try {
    const res = await LocalKnowledgeAutoRepo.query139(tenantSchema(tenantId), [documentId, tenantId]);

    if (res.rows.length === 0 || !res.rows[0].retention_rule) {
      return null;
    }

    return res.rows[0].retention_rule as ComplianceRetentionRule;
  } catch (err) {
    logger.error('[LocalKnowledgeRetention] Failed to get compliance retention rule', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Apply retention policy to all sources for a tenant
 * Respects legal hold and compliance-driven retention rules
 */
export async function applyRetentionPolicies(tenantId: string): Promise<{
  archived: number;
  deleted: number;
  errors: number;
}> {
  const _schema = tenantSchema(tenantId);
  let totalArchived = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  try {
    // Get all source types for this tenant
    const res = await LocalKnowledgeAutoRepo.query138(tenantSchema(tenantId), [tenantId]);

    for (const row of res.rows) {
      const sourceType = row.source_type;
      const archiveResult = await archiveOldVersions(tenantId, sourceType);
      const cleanupResult = await cleanupExpiredArchives(tenantId, sourceType);

      totalArchived += archiveResult.archived;
      totalDeleted += cleanupResult.deleted;
      totalErrors += archiveResult.errors + cleanupResult.errors;
    }

    logger.info('[LocalKnowledgeRetention] Retention policies applied', {
      tenantId,
      archived: totalArchived,
      deleted: totalDeleted,
      errors: totalErrors,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeRetention] Retention policy application failed', {
      tenantId,
      error: (err as Error).message,
    });
    totalErrors++;
  }

  return {
    archived: totalArchived,
    deleted: totalDeleted,
    errors: totalErrors,
  };
}
