/**
 * Local Knowledge Diagnostics Service - Spec Compliant Implementation
 * Canonical service for system health monitoring and diagnostics
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';

export interface DiagnosticsResult {
  tenantId: string;
  moduleCode: string;
  healthy: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    detail?: string;
    recommendation?: string;
  }>;
  metrics: {
    totalDocuments: number;
    indexedDocuments: number;
    failedDocuments: number;
    pendingDocuments: number;
    totalChunks: number;
    indexHealth: 'healthy' | 'degraded' | 'rebuilding' | 'error';
    averageIndexingTime: number | null;
    lastIndexingAt: string | null;
  };
  checkedAt: string;
}

export interface HealthCheck {
  name: string;
  check: (tenantId: string) => Promise<{ passed: boolean; detail?: string; recommendation?: string }>;
}

/**
 * Main diagnostics entry point
 * Implements the canonical LocalKnowledgeDiagnosticsService from spec §3.1
 */
export async function runDiagnostics(tenantId: string): Promise<DiagnosticsResult> {
  const startTime = Date.now();
  const checks: DiagnosticsResult['checks'] = [];
  
  try {
    // Core health checks
    const healthChecks: HealthCheck[] = [
      { name: 'schema_exists', check: checkSchemaExists },
      { name: 'tables_exist', check: checkTablesExist },
      { name: 'document_processing', check: checkDocumentProcessing },
      { name: 'index_health', check: checkIndexHealth },
      { name: 'embedding_service', check: checkEmbeddingService },
      { name: 'search_functionality', check: checkSearchFunctionality },
      { name: 'storage_quota', check: checkStorageQuota },
      { name: 'workflow_integration', check: checkWorkflowIntegration }
    ];

    // Run all checks
    for (const healthCheck of healthChecks) {
      try {
        const result = await healthCheck.check(tenantId);
        checks.push({
          name: healthCheck.name,
          passed: result.passed,
          detail: result.detail,
          recommendation: result.recommendation
        });
      } catch (error) {
        checks.push({
          name: healthCheck.name,
          passed: false,
          detail: `Check failed: ${(error as Error).message}`,
          recommendation: 'Review error logs and retry diagnostics'
        });
      }
    }

    // Get metrics
    const metrics = await getMetrics(tenantId);

    const diagnosticsTime = Date.now() - startTime;
    const healthy = checks.every(c => c.passed);

    logger.info('[LocalKnowledgeDiagnosticsService] Diagnostics completed', {
      tenantId,
      healthy,
      checksPassed: checks.filter(c => c.passed).length,
      totalChecks: checks.length,
      diagnosticsTime
    });

    return {
      tenantId,
      moduleCode: 'local-knowledge',
      healthy,
      checks,
      metrics,
      checkedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('[LocalKnowledgeDiagnosticsService] Diagnostics failed', {
      tenantId,
      error: (error as Error).message
    });

    return {
      tenantId,
      moduleCode: 'local-knowledge',
      healthy: false,
      checks: [{
        name: 'diagnostics_framework',
        passed: false,
        detail: `Diagnostics framework error: ${(error as Error).message}`,
        recommendation: 'Review system configuration and retry'
      }],
      metrics: await getMetrics(tenantId),
      checkedAt: new Date().toISOString()
    };
  }
}

/**
 * Get system metrics
 */
async function getMetrics(tenantId: string): Promise<DiagnosticsResult['metrics']> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT 
         COUNT(*) as total_documents,
         COUNT(CASE WHEN status = 'embedded' THEN 1 END) as indexed_documents,
         COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_documents,
         COUNT(CASE WHEN status IN ('pending', 'ingesting', 'chunked') THEN 1 END) as pending_documents,
         COALESCE(AVG(chunk_count), 0) as avg_chunks,
         MAX(embedded_at) as last_indexing_at
       FROM "${schema}".local_knowledge_documents`,
      []
    );

    const row = rows[0];
    const totalDocuments = parseInt(row.total_documents);
    const indexedDocuments = parseInt(row.indexed_documents);
    const failedDocuments = parseInt(row.failed_documents);
    const pendingDocuments = parseInt(row.pending_documents);

    // Determine index health
    let indexHealth: DiagnosticsResult['metrics']['indexHealth'] = 'healthy';
    if (failedDocuments > totalDocuments * 0.1) {
      indexHealth = 'error';
    } else if (pendingDocuments > totalDocuments * 0.2) {
      indexHealth = 'degraded';
    } else if (indexedDocuments < totalDocuments * 0.8) {
      indexHealth = 'rebuilding';
    }

    // Get total chunks
    const { rows: chunkRows } = await safeQuery(
      `SELECT COUNT(*) as total_chunks FROM "${schema}".local_knowledge_chunks`,
      []
    );

    return {
      totalDocuments,
      indexedDocuments,
      failedDocuments,
      pendingDocuments,
      totalChunks: parseInt(chunkRows[0].total_chunks),
      indexHealth,
      averageIndexingTime: null, // Would need to calculate from ingestion logs
      lastIndexingAt: row.last_indexing_at
    };

  } catch (error) {
    logger.warn('[LocalKnowledgeDiagnosticsService] Failed to get metrics', {
      tenantId,
      error: (error as Error).message
    });

    return {
      totalDocuments: 0,
      indexedDocuments: 0,
      failedDocuments: 0,
      pendingDocuments: 0,
      totalChunks: 0,
      indexHealth: 'error',
      averageIndexingTime: null,
      lastIndexingAt: null
    };
  }
}

// Individual health check implementations

async function checkSchemaExists(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  const schema = tenantSchema(tenantId);
  
  const { rows } = await safeQuery(
    `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));

  if (!rows.length) {
    return {
      passed: false,
      detail: `Schema '${schema}' does not exist`,
      recommendation: 'Run database migrations to create required schema'
    };
  }

  return { passed: true, detail: `Schema '${schema}' exists` };
}

async function checkTablesExist(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  const schema = tenantSchema(tenantId);
  
  const requiredTables = [
    'local_knowledge_documents',
    'local_knowledge_chunks',
    'local_knowledge_embeddings',
    'local_knowledge_sources',
    'local_knowledge_ingestion_log'
  ];

  const { rows } = await safeQuery(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1`,
    [schema],
  ).catch(() => ({ rows: [] }));

  const existingTables = rows.map((r: any) => r.table_name);
  const missingTables = requiredTables.filter(table => !existingTables.includes(table));

  if (missingTables.length > 0) {
    return {
      passed: false,
      detail: `Missing tables: ${missingTables.join(', ')}`,
      recommendation: 'Run database migrations to create missing tables'
    };
  }

  return { passed: true, detail: `All ${requiredTables.length} required tables exist` };
}

async function checkDocumentProcessing(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  const schema = tenantSchema(tenantId);
  
  const { rows } = await safeQuery(
    `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
       COUNT(CASE WHEN created_at < NOW() - INTERVAL '1 hour' AND status IN ('pending', 'ingesting') THEN 1 END) as stuck
     FROM "${schema}".local_knowledge_documents`,
    []
  );

  const total = parseInt(rows[0].total);
  const failed = parseInt(rows[0].failed);
  const stuck = parseInt(rows[0].stuck);

  if (stuck > 0) {
    return {
      passed: false,
      detail: `${stuck} documents stuck in processing for over 1 hour`,
      recommendation: 'Check ingestion service and retry failed documents'
    };
  }

  if (failed > total * 0.1) {
    return {
      passed: false,
      detail: `${failed} failed documents (${((failed/total)*100).toFixed(1)}%)`,
      recommendation: 'Review failed documents and check ingestion configuration'
    };
  }

  return { passed: true, detail: `Document processing healthy: ${total} total, ${failed} failed` };
}

async function checkIndexHealth(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  const schema = tenantSchema(tenantId);
  
  // Check for orphaned chunks (chunks without embeddings)
  const { rows: orphanedRows } = await safeQuery(
    `SELECT COUNT(*) as count
     FROM "${schema}".local_knowledge_chunks c
     LEFT JOIN "${schema}".local_knowledge_embeddings e ON c.chunk_id = e.chunk_id
     LEFT JOIN "${schema}".local_knowledge_documents d ON c.document_id = d.document_id
     WHERE d.status = 'embedded' AND e.chunk_id IS NULL`,
    []
  );

  const orphanedCount = parseInt(orphanedRows[0].count);

  if (orphanedCount > 0) {
    return {
      passed: false,
      detail: `${orphanedCount} chunks missing embeddings for embedded documents`,
      recommendation: 'Run index rebuild to fix missing embeddings'
    };
  }

  return { passed: true, detail: 'Index health: no orphaned chunks found' };
}

async function checkEmbeddingService(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  // Check if embedding service is responsive by trying a simple test
  try {
    // This would typically call the AI service
    // For now, we'll check if there are recent successful embeddings
    const schema = tenantSchema(tenantId);
    
    const { rows } = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".local_knowledge_documents
       WHERE status = 'embedded' AND embedded_at > NOW() - INTERVAL '24 hours'`,
      []
    );

    const recentEmbeddings = parseInt(rows[0].count);

    if (recentEmbeddings === 0) {
      return {
        passed: false,
        detail: 'No successful embeddings in last 24 hours',
        recommendation: 'Check embedding service configuration and AI service availability'
      };
    }

    return { passed: true, detail: `Embedding service active: ${recentEmbeddings} recent embeddings` };

  } catch (error) {
    return {
      passed: false,
      detail: `Embedding service check failed: ${(error as Error).message}`,
      recommendation: 'Verify AI service connectivity and configuration'
    };
  }
}

async function checkSearchFunctionality(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  try {
    // Test search functionality with a simple query
    const { retrieveKnowledge } = await import('./KnowledgeRetrievalService.js');
    
    const testResult = await retrieveKnowledge(tenantId, {
      query: 'test',
      topK: 1
    });

    return { 
      passed: true, 
      detail: `Search functional: returned ${testResult.results.length} results` 
    };

  } catch (error) {
    return {
      passed: false,
      detail: `Search functionality failed: ${(error as Error).message}`,
      recommendation: 'Check search configuration and index status'
    };
  }
}

async function checkStorageQuota(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  const schema = tenantSchema(tenantId);
  
  const { rows } = await safeQuery(
    `SELECT 
       SUM(file_size_bytes) as total_size,
       COUNT(*) as document_count
     FROM "${schema}".local_knowledge_documents`,
    []
  );

  const totalSize = parseInt(rows[0].total_size) || 0;
  const documentCount = parseInt(rows[0].document_count);

  // Check if approaching storage limits (example: 1GB limit)
  const sizeLimitGB = 1;
  const sizeLimitBytes = sizeLimitGB * 1024 * 1024 * 1024;
  const usagePercent = (totalSize / sizeLimitBytes) * 100;

  if (usagePercent > 90) {
    return {
      passed: false,
      detail: `Storage usage critical: ${usagePercent.toFixed(1)}% of ${sizeLimitGB}GB limit`,
      recommendation: 'Clean up old documents or increase storage quota'
    };
  }

  if (usagePercent > 80) {
    return {
      passed: true,
      detail: `Storage usage warning: ${usagePercent.toFixed(1)}% of ${sizeLimitGB}GB limit`,
      recommendation: 'Monitor storage usage and plan cleanup'
    };
  }

  return { 
    passed: true, 
    detail: `Storage usage healthy: ${usagePercent.toFixed(1)}% of ${sizeLimitGB}GB (${documentCount} documents)` 
  };
}

async function checkWorkflowIntegration(tenantId: string): Promise<{ passed: boolean; detail?: string; recommendation?: string }> {
  try {
    // Check if workflow service is available and functional
    const { getPendingApprovals } = await import('./local-knowledge-workflow.service.js');
    
    // Test workflow service availability
    const pendingApprovals = await getPendingApprovals(tenantId, 1);

    return { 
      passed: true, 
      detail: `Workflow integration functional: ${pendingApprovals.length} pending approvals` 
    };

  } catch (error) {
    return {
      passed: false,
      detail: `Workflow integration failed: ${(error as Error).message}`,
      recommendation: 'Check DAuth service integration and workflow configuration'
    };
  }
}
