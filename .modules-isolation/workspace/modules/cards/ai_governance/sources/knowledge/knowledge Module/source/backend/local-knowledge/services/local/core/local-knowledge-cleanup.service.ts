// ============================================
// Shahin-Ai — Local Knowledge Cleanup Service
// R3.3B Phase G: Detects and flags orphaned knowledge records
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';

export interface OrphanReport {
  orphanType: 'chunk_without_document' | 'document_without_ingestion' | 'ingestion_without_source' | 'published_without_document';
  count: number;
  sampleIds: string[];
}

/**
 * Detect orphaned chunks (chunks without valid document reference)
 */
export async function detectOrphanChunks(tenantId: string): Promise<OrphanReport> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT c.chunk_id
       FROM "${schema}".local_knowledge_chunks c
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1 AND d.document_id IS NULL
       LIMIT 100`,
      [tenantId],
    );

    return {
      orphanType: 'chunk_without_document',
      count: res.rows.length,
      sampleIds: res.rows.map(r => r.chunk_id).slice(0, 10),
    };
  } catch (err) {
    logger.error('[LocalKnowledgeCleanup] Failed to detect orphan chunks', {
      tenantId,
      error: (err as Error).message,
    });
    return { orphanType: 'chunk_without_document', count: 0, sampleIds: [] };
  }
}

/**
 * Detect orphaned documents (documents without valid ingestion reference)
 */
export async function detectOrphanDocuments(tenantId: string): Promise<OrphanReport> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT d.document_id
       FROM "${schema}".local_knowledge_documents d
       LEFT JOIN "${schema}".local_knowledge_ingestion_log i ON i.ingestion_id = d.ingestion_id AND i.tenant_id = d.tenant_id
       WHERE d.tenant_id = $1 AND i.ingestion_id IS NULL
       LIMIT 100`,
      [tenantId],
    );

    return {
      orphanType: 'document_without_ingestion',
      count: res.rows.length,
      sampleIds: res.rows.map(r => r.document_id).slice(0, 10),
    };
  } catch (err) {
    logger.error('[LocalKnowledgeCleanup] Failed to detect orphan documents', {
      tenantId,
      error: (err as Error).message,
    });
    return { orphanType: 'document_without_ingestion', count: 0, sampleIds: [] };
  }
}

/**
 * Detect orphaned ingestions (ingestions without valid source reference)
 */
export async function detectOrphanIngestions(tenantId: string): Promise<OrphanReport> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT i.ingestion_id
       FROM "${schema}".local_knowledge_ingestion_log i
       LEFT JOIN "${schema}".local_knowledge_sources s ON s.source_id = i.source_id AND s.tenant_id = i.tenant_id
       WHERE i.tenant_id = $1 AND s.source_id IS NULL
       LIMIT 100`,
      [tenantId],
    );

    return {
      orphanType: 'ingestion_without_source',
      count: res.rows.length,
      sampleIds: res.rows.map(r => r.ingestion_id).slice(0, 10),
    };
  } catch (err) {
    logger.error('[LocalKnowledgeCleanup] Failed to detect orphan ingestions', {
      tenantId,
      error: (err as Error).message,
    });
    return { orphanType: 'ingestion_without_source', count: 0, sampleIds: [] };
  }
}

/**
 * Detect orphaned published knowledge (published without valid document reference)
 */
export async function detectOrphanPublished(tenantId: string): Promise<OrphanReport> {
  const schema = tenantSchema(tenantId);
  try {
    const res = await safeQuery(
      `SELECT p.published_id
       FROM "${schema}".local_knowledge_published p
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = p.document_id AND d.tenant_id = p.tenant_id
       WHERE p.tenant_id = $1 AND d.document_id IS NULL
       LIMIT 100`,
      [tenantId],
    );

    return {
      orphanType: 'published_without_document',
      count: res.rows.length,
      sampleIds: res.rows.map(r => r.published_id).slice(0, 10),
    };
  } catch (err) {
    logger.error('[LocalKnowledgeCleanup] Failed to detect orphan published', {
      tenantId,
      error: (err as Error).message,
    });
    return { orphanType: 'published_without_document', count: 0, sampleIds: [] };
  }
}

/**
 * Generate full orphan report for a tenant
 */
export async function generateOrphanReport(tenantId: string): Promise<{
  reports: OrphanReport[];
  totalOrphans: number;
}> {
  const reports: OrphanReport[] = [];

  reports.push(await detectOrphanChunks(tenantId));
  reports.push(await detectOrphanDocuments(tenantId));
  reports.push(await detectOrphanIngestions(tenantId));
  reports.push(await detectOrphanPublished(tenantId));

  const totalOrphans = reports.reduce((sum, r) => sum + r.count, 0);

  logger.info('[LocalKnowledgeCleanup] Orphan report generated', {
    tenantId,
    totalOrphans,
    reports: reports.map(r => ({ type: r.orphanType, count: r.count })),
  });

  return { reports, totalOrphans };
}

/**
 * Clean up orphaned chunks (delete chunks without valid document)
 */
export async function cleanupOrphanChunks(tenantId: string, dryRun: boolean = true): Promise<{ deleted: number }> {
  const schema = tenantSchema(tenantId);
  let deleted = 0;

  try {
    if (dryRun) {
      const report = await detectOrphanChunks(tenantId);
      logger.info('[LocalKnowledgeCleanup] Dry run: would delete orphan chunks', {
        tenantId,
        count: report.count,
      });
      return { deleted: 0 };
    }

    const res = await safeQuery(
      `DELETE FROM "${schema}".local_knowledge_chunks c
       USING "${schema}".local_knowledge_chunks c2
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = c2.document_id AND d.tenant_id = c2.tenant_id
       WHERE c.chunk_id = c2.chunk_id
         AND c.tenant_id = $1
         AND d.document_id IS NULL
       RETURNING c.chunk_id`,
      [tenantId],
    );

    deleted = res.rows.length;

    logger.info('[LocalKnowledgeCleanup] Cleaned up orphan chunks', {
      tenantId,
      deleted,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeCleanup] Failed to cleanup orphan chunks', {
      tenantId,
      error: (err as Error).message,
    });
  }

  return { deleted };
}

/**
 * Clean up orphaned published knowledge (delete published without valid document)
 */
export async function cleanupOrphanPublished(tenantId: string, dryRun: boolean = true): Promise<{ deleted: number }> {
  const schema = tenantSchema(tenantId);
  let deleted = 0;

  try {
    if (dryRun) {
      const report = await detectOrphanPublished(tenantId);
      logger.info('[LocalKnowledgeCleanup] Dry run: would delete orphan published', {
        tenantId,
        count: report.count,
      });
      return { deleted: 0 };
    }

    const res = await safeQuery(
      `DELETE FROM "${schema}".local_knowledge_published p
       USING "${schema}".local_knowledge_published p2
       LEFT JOIN "${schema}".local_knowledge_documents d ON d.document_id = p2.document_id AND d.tenant_id = p2.tenant_id
       WHERE p.published_id = p2.published_id
         AND p.tenant_id = $1
         AND d.document_id IS NULL
       RETURNING p.published_id`,
      [tenantId],
    );

    deleted = res.rows.length;

    logger.info('[LocalKnowledgeCleanup] Cleaned up orphan published', {
      tenantId,
      deleted,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeCleanup] Failed to cleanup orphan published', {
      tenantId,
      error: (err as Error).message,
    });
  }

  return { deleted };
}

/**
 * Validate knowledge integrity (check for orphans)
 */
export async function validateKnowledgeIntegrity(tenantId: string): Promise<{
  valid: boolean;
  orphanCount: number;
  reports: OrphanReport[];
}> {
  const { reports, totalOrphans } = await generateOrphanReport(tenantId);

  const valid = totalOrphans === 0;

  if (!valid) {
    logger.warn('[LocalKnowledgeCleanup] Knowledge integrity validation failed', {
      tenantId,
      orphanCount: totalOrphans,
      reports: reports.filter(r => r.count > 0).map(r => ({ type: r.orphanType, count: r.count })),
    });
  }

  return {
    valid,
    orphanCount: totalOrphans,
    reports,
  };
}
