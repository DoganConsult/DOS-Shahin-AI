/**
 * Local Knowledge Index Service
 * Enterprise-grade knowledge indexing with health monitoring and diagnostics
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { SYSTEM_JOB_ACTOR as _SYSTEM_JOB_ACTOR } from '../../ports/platform.port';

export interface IndexHealthResult {
  tenantId: string;
  indexStatus: 'healthy' | 'degraded' | 'rebuilding' | 'error';
  totalDocuments: number;
  indexedDocuments: number;
  failedDocuments: number;
  pendingDocuments: number;
  averageIndexingTime: number | null;
  lastIndexingAt: string | null;
  embeddingModelVersion: string | null;
  issues: Array<{
    type: 'embedding_failure' | 'chunk_error' | 'vector_index_issue' | 'storage_issue';
    count: number;
    description: string;
  }>;
}

export interface IndexingTask {
  documentId: string;
  taskType: 'create' | 'update' | 'rebuild';
  priority: 'low' | 'medium' | 'high';
  scheduledAt: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Get comprehensive index health status
 */
export async function getIndexHealth(tenantId: string): Promise<IndexHealthResult> {
  const schema = tenantSchema(tenantId);

  try {
    // Get document statistics
    const { rows: docStats } = await safeQuery(
      `SELECT 
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'embedded' THEN 1 END) as indexed,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
         COUNT(CASE WHEN status IN ('pending', 'ingesting', 'chunked') THEN 1 END) as pending,
         AVG(EXTRACT(EPOCH FROM (embedded_at - ingested_at))) as avg_indexing_time,
         MAX(embedded_at) as last_indexing_at
       FROM "${schema}".local_knowledge_documents`,
      []
    );

    // Get embedding model info
    const { rows: modelInfo } = await safeQuery(
      `SELECT DISTINCT embedding_model, embedding_dimension 
       FROM "${schema}".local_knowledge_documents 
       WHERE embedding_model IS NOT NULL 
       LIMIT 1`,
      []
    );

    // Detect indexing issues
    const issues = await detectIndexingIssues(tenantId);

    // Determine overall index health
    const total = parseInt(docStats[0].total);
    const indexed = parseInt(docStats[0].indexed);
    const failed = parseInt(docStats[0].failed);
    const pending = parseInt(docStats[0].pending);

    let indexStatus: IndexHealthResult['indexStatus'] = 'healthy';
    
    if (failed > total * 0.1) {
      indexStatus = 'error';
    } else if (pending > total * 0.2 || issues.length > 0) {
      indexStatus = 'degraded';
    } else if (indexed < total * 0.8) {
      indexStatus = 'rebuilding';
    }

    return {
      tenantId,
      indexStatus,
      totalDocuments: total,
      indexedDocuments: indexed,
      failedDocuments: failed,
      pendingDocuments: pending,
      averageIndexingTime: docStats[0].avg_indexing_time ? parseFloat(docStats[0].avg_indexing_time) : null,
      lastIndexingAt: docStats[0].last_indexing_at,
      embeddingModelVersion: modelInfo[0]?.embedding_model || null,
      issues
    };

  } catch (error) {
    logger.error('[local-knowledge-index] Failed to get index health', {
      tenantId,
      error: (error as Error).message
    });
    
    return {
      tenantId,
      indexStatus: 'error',
      totalDocuments: 0,
      indexedDocuments: 0,
      failedDocuments: 0,
      pendingDocuments: 0,
      averageIndexingTime: null,
      lastIndexingAt: null,
      embeddingModelVersion: null,
      issues: [{
        type: 'vector_index_issue',
        count: 1,
        description: `Index health check failed: ${(error as Error).message}`
      }]
    };
  }
}

/**
 * Detect specific indexing issues
 */
async function detectIndexingIssues(tenantId: string): Promise<IndexHealthResult['issues']> {
  const schema = tenantSchema(tenantId);
  const issues: IndexHealthResult['issues'] = [];

  try {
    // Check for embedding failures
    const { rows: embeddingFailures } = await safeQuery(
      `SELECT COUNT(*) as count 
       FROM "${schema}".local_knowledge_documents 
       WHERE status = 'failed' AND error_message LIKE '%embedding%'`,
      []
    );

    if (parseInt(embeddingFailures[0].count) > 0) {
      issues.push({
        type: 'embedding_failure',
        count: parseInt(embeddingFailures[0].count),
        description: 'Documents failed during embedding process'
      });
    }

    // Check for chunk errors
    const { rows: chunkErrors } = await safeQuery(
      `SELECT COUNT(*) as count 
       FROM "${schema}".local_knowledge_documents 
       WHERE status = 'failed' AND error_message LIKE '%chunk%'`,
      []
    );

    if (parseInt(chunkErrors[0].count) > 0) {
      issues.push({
        type: 'chunk_error',
        count: parseInt(chunkErrors[0].count),
        description: 'Documents failed during chunking process'
      });
    }

    // Check for vector index issues (documents with chunks but no embeddings)
    const { rows: vectorIssues } = await safeQuery(
      `SELECT COUNT(DISTINCT d.document_id) as count
       FROM "${schema}".local_knowledge_documents d
       JOIN "${schema}".local_knowledge_chunks c ON d.document_id = c.document_id
       LEFT JOIN "${schema}".local_knowledge_embeddings e ON c.chunk_id = e.chunk_id
       WHERE d.status = 'embedded' AND e.chunk_id IS NULL`,
      []
    );

    if (parseInt(vectorIssues[0].count) > 0) {
      issues.push({
        type: 'vector_index_issue',
        count: parseInt(vectorIssues[0].count),
        description: 'Documents marked as embedded but missing vector embeddings'
      });
    }

    // Check for storage issues (orphaned chunks)
    const { rows: storageIssues } = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".local_knowledge_chunks c
       LEFT JOIN "${schema}".local_knowledge_documents d ON c.document_id = d.document_id
       WHERE d.document_id IS NULL`,
      []
    );

    if (parseInt(storageIssues[0].count) > 0) {
      issues.push({
        type: 'storage_issue',
        count: parseInt(storageIssues[0].count),
        description: 'Orphaned chunks without associated documents'
      });
    }

  } catch (error) {
    logger.warn('[local-knowledge-index] Failed to detect issues', {
      tenantId,
      error: (error as Error).message
    });
  }

  return issues;
}

/**
 * Rebuild index for specific documents
 */
export async function rebuildIndex(
  tenantId: string,
  documentIds: string[],
  userId: string
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}> {
  const schema = tenantSchema(tenantId);
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    for (const documentId of documentIds) {
      try {
        // Reset document to chunked status
        await safeQuery(
          `UPDATE "${schema}".local_knowledge_documents
           SET status = 'chunked', embedded_at = NULL, updated_by = $1, updated_at = NOW()
           WHERE document_id = $2 AND tenant_id = $3`,
          [userId, documentId, tenantId]
        );

        // Delete existing embeddings for this document
        await safeQuery(
          `DELETE FROM "${schema}".local_knowledge_embeddings
           WHERE chunk_id IN (
             SELECT chunk_id FROM "${schema}".local_knowledge_chunks 
             WHERE document_id = $1
           )`,
          [documentId]
        );

        // Log rebuild action
        const auditData = {
          action: 'rebuild_index',
          userId,
          tenantId,
          timestamp: new Date().toISOString(),
          metadata: { documentId }
        };

        await safeQuery(
          `INSERT INTO "${schema}".local_knowledge_index_log
           (document_id, action, performed_by, audit_data, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [documentId, 'rebuild', userId, JSON.stringify(auditData)]
        );

        processed++;
      } catch (error) {
        failed++;
        errors.push(`Document ${documentId}: ${(error as Error).message}`);
      }
    }

    logger.info('[local-knowledge-index] Index rebuild completed', {
      tenantId,
      userId,
      totalDocuments: documentIds.length,
      processed,
      failed
    });

    return {
      success: failed === 0,
      processed,
      failed,
      errors
    };

  } catch (error) {
    logger.error('[local-knowledge-index] Index rebuild failed', {
      tenantId,
      userId,
      documentCount: documentIds.length,
      error: (error as Error).message
    });

    return {
      success: false,
      processed,
      failed,
      errors: [`Rebuild process failed: ${(error as Error).message}`]
    };
  }
}

/**
 * Get indexing queue
 */
export async function getIndexingQueue(
  tenantId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  tasks: IndexingTask[];
  total: number;
}> {
  const schema = tenantSchema(tenantId);

  const { rows } = await safeQuery(
    `SELECT 
       document_id,
       CASE 
         WHEN status = 'pending' THEN 'create'
         WHEN status = 'ingesting' THEN 'update'
         ELSE 'rebuild'
       END as task_type,
       CASE 
         WHEN created_at > NOW() - INTERVAL '1 hour' THEN 'high'
         WHEN created_at > NOW() - INTERVAL '24 hours' THEN 'medium'
         ELSE 'low'
       END as priority,
       created_at as scheduled_at,
       0 as retry_count,
       3 as max_retries
     FROM "${schema}".local_knowledge_documents
     WHERE status IN ('pending', 'ingesting', 'chunked')
     ORDER BY 
       CASE 
         WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1
         WHEN created_at > NOW() - INTERVAL '24 hours' THEN 2
         ELSE 3
       END,
       created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const { rows: countRows } = await safeQuery(
    `SELECT COUNT(*) as total
     FROM "${schema}".local_knowledge_documents
     WHERE status IN ('pending', 'ingesting', 'chunked')`,
    []
  );

  return {
    tasks: rows.map(row => ({
      documentId: row.document_id,
      taskType: row.task_type,
      priority: row.priority,
      scheduledAt: row.scheduled_at,
      retryCount: row.retry_count,
      maxRetries: row.max_retries
    })),
    total: parseInt(countRows[0].total)
  };
}
