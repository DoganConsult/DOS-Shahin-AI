import { safeQuery, tenantSchema } from '../ports/database.port';
import type { GenericRow } from '@dos/types';
import { logger } from '../ports/logger.port';

export interface PipelineStatus {
  tenantId: string;
  totalDocuments: number;
  embeddedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  totalChunks: number;
  embeddingModel: string | null;
  lastRunAt: string | null;
  status: 'idle' | 'running' | 'error';
}

export async function getPipelineStatus(tenantId: string): Promise<PipelineStatus> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER(WHERE status = 'embedded')::int AS embedded,
       COUNT(*) FILTER(WHERE status IN ('pending', 'ingesting', 'chunked'))::int AS pending,
       COUNT(*) FILTER(WHERE status = 'failed')::int AS failed,
       MAX(embedded_at) AS last_run_at
     FROM "${schema}".local_knowledge_documents
     WHERE deleted_at IS NULL`,
  );

  const stats = rows[0] as GenericRow;

  const { rows: chunkRows } = await safeQuery(
    `SELECT COUNT(*)::int AS total_chunks FROM "${schema}".local_knowledge_chunks WHERE deleted_at IS NULL`,
  ).catch(() => ({ rows: [{ total_chunks: 0 }] }));

  const pending = Number(stats?.pending ?? 0);
  const failed = Number(stats?.failed ?? 0);

  return {
    tenantId,
    totalDocuments: Number(stats?.total ?? 0),
    embeddedDocuments: Number(stats?.embedded ?? 0),
    pendingDocuments: pending,
    failedDocuments: failed,
    totalChunks: Number((chunkRows[0] as GenericRow)?.total_chunks ?? 0),
    embeddingModel: null,
    lastRunAt: stats?.last_run_at ? String(stats.last_run_at) : null,
    status: pending > 0 ? 'running' : failed > 0 ? 'error' : 'idle',
  };
}

export interface ReindexResult {
  documentsQueued: number;
  message: string;
}

export async function triggerReindex(tenantId: string): Promise<ReindexResult> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `UPDATE "${schema}".local_knowledge_documents
     SET status = 'pending', updated_at = NOW()
     WHERE deleted_at IS NULL AND status IN ('embedded', 'failed')
     RETURNING document_id`,
  );

  const count = rows.length;
  logger.info(`[local-knowledge] Reindex triggered for tenant ${tenantId}: ${count} documents queued`);

  return {
    documentsQueued: count,
    message: count > 0
      ? `${count} documents queued for re-embedding.`
      : 'No documents to reindex.',
  };
}
