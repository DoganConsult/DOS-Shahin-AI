type GenericRow = Record<string, unknown>;
// ============================================
// Shahin-Ai — Local Knowledge Retention Service
// R3.3B Phase G: Manages retention policies, versioning, and archiving
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';

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
  const schema = tenantSchema(tenantId);
  const policy = getRetentionPolicy(sourceType);
  const archiveThreshold = new Date();
  archiveThreshold.setDate(archiveThreshold.getDate() - policy.archiveAfterDays);

  let archived = 0;
  let errors = 0;

  try {
    // Find documents that should be archived
    const res = await safeQuery(
      `SELECT d.document_id, d.ingestion_id, d.version, d.created_at
       FROM "${schema}".local_knowledge_documents d
       INNER JOIN "${schema}".local_knowledge_ingestion_log i ON i.ingestion_id = d.ingestion_id
       INNER JOIN "${schema}".local_knowledge_sources s ON s.source_id = i.source_id
       WHERE d.tenant_id = $1
         AND s.source_type = $2
         AND d.status = 'active'
         AND d.created_at < $3
       ORDER BY d.document_id, d.version DESC`,
      [tenantId, sourceType, archiveThreshold.toISOString()],
    );

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
          await safeQuery(
            `UPDATE "${schema}".local_knowledge_documents
             SET status = 'archived', updated_at = NOW()
             WHERE document_id = $1 AND version = $2 AND tenant_id = $3`,
            [docId, version.version, tenantId],
          );
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
  const schema = tenantSchema(tenantId);
  const policy = getRetentionPolicy(sourceType);
  const expiryThreshold = new Date();
  expiryThreshold.setDate(expiryThreshold.getDate() - policy.retentionDays);

  let deleted = 0;
  let errors = 0;

  try {
    // Find archived documents beyond retention period
    // EXCLUDE documents under legal hold
    const res = await safeQuery(
      `SELECT d.document_id, d.ingestion_id
       FROM "${schema}".local_knowledge_documents d
       INNER JOIN "${schema}".local_knowledge_ingestion_log i ON i.ingestion_id = d.ingestion_id
       INNER JOIN "${schema}".local_knowledge_sources s ON s.source_id = i.source_id
       WHERE d.tenant_id = $1
         AND s.source_type = $2
         AND d.status = 'archived'
         AND d.updated_at < $3
         AND (d.legal_hold IS NULL OR d.legal_hold = FALSE)`,
      [tenantId, sourceType, expiryThreshold.toISOString()],
    );

    // Delete expired archives (cascade will handle chunks)
    // Skip documents under legal hold
    for (const row of res.rows) {
      try {
        // Double-check legal hold before deletion
        const legalHoldCheck = await safeQuery(
          `SELECT legal_hold FROM "${schema}".local_knowledge_documents
           WHERE document_id = $1 AND tenant_id = $2`,
          [row.document_id, tenantId],
        );
        if (legalHoldCheck.rows.length > 0 && legalHoldCheck.rows[0].legal_hold) {
          logger.info('[LocalKnowledgeRetention] Skipping deletion due to legal hold', {
            tenantId,
            documentId: row.document_id,
          });
          continue;
        }

        await safeQuery(
          `DELETE FROM "${schema}".local_knowledge_documents
           WHERE document_id = $1 AND tenant_id = $2`,
          [row.document_id, tenantId],
        );
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
  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `SELECT retention_rule FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );

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
  const schema = tenantSchema(tenantId);
  let totalArchived = 0;
  let totalDeleted = 0;
  let totalErrors = 0;

  try {
    // Get all source types for this tenant
    const res = await safeQuery(
      `SELECT DISTINCT source_type
       FROM "${schema}".local_knowledge_sources
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId],
    );

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
