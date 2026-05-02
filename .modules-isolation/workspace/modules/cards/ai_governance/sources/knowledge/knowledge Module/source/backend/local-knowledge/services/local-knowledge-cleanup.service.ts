// ============================================
// Shahin-Ai — Local Knowledge Cleanup Service
// R3.3B Phase G: Detects and flags orphaned knowledge records
// ============================================

import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

export interface OrphanReport {
  orphanType: 'chunk_without_document' | 'document_without_ingestion' | 'ingestion_without_source' | 'published_without_document';
  count: number;
  sampleIds: string[];
}

/**
 * Detect orphaned chunks (chunks without valid document reference)
 */
export async function detectOrphanChunks(tenantId: string): Promise<OrphanReport> {
  const _schema = tenantSchema(tenantId);
  try {
    const res = await LocalKnowledgeAutoRepo.query49(tenantSchema(tenantId), [tenantId]);

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
  const _schema = tenantSchema(tenantId);
  try {
    const res = await LocalKnowledgeAutoRepo.query48(tenantSchema(tenantId), [tenantId]);

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
  const _schema = tenantSchema(tenantId);
  try {
    const res = await LocalKnowledgeAutoRepo.query47(tenantSchema(tenantId), [tenantId]);

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
  const _schema = tenantSchema(tenantId);
  try {
    const res = await LocalKnowledgeAutoRepo.query46(tenantSchema(tenantId), [tenantId]);

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
  const _schema = tenantSchema(tenantId);
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

    const res = await LocalKnowledgeAutoRepo.query45(tenantSchema(tenantId), [tenantId]);

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
  const _schema = tenantSchema(tenantId);
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

    const res = await LocalKnowledgeAutoRepo.query44(tenantSchema(tenantId), [tenantId]);

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
