// ============================================
// Shahin-Ai — Local Knowledge Bulk Access Service
// R3.3B Phase G+: Bulk access checks for multiple documents
// ============================================

import { checkDocumentAccess, AccessCheckResult } from './local-knowledge-access-control.service';
import { logger } from '../../../ports/logger.port';
import { safeQuery } from "@dos/db";

/**
 * Bulk access check for multiple documents
 */
export async function bulkCheckDocumentAccess(
  tenantId: string,
  documentIds: string[],
  userId: string,
  userRole: string,
  userOrgUnits?: string[],
  accessType: 'read' | 'download' | 'export' | 'publish' | 'delete' = 'read',
): Promise<Record<string, AccessCheckResult>> {
  const results: Record<string, AccessCheckResult> = {};

  // Check access for each document in parallel (with concurrency limit)
  const batchSize = 10;
  for (let i = 0; i < documentIds.length; i += batchSize) {
    const batch = documentIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (documentId) => {
        try {
          const result = await checkDocumentAccess(
            tenantId,
            userId,
            documentId,
            accessType === 'read' ? 'read' : accessType === 'delete' ? 'admin' : 'write',
          );
          return { documentId, result };
        } catch (err) {
          logger.warn('[LocalKnowledgeBulkAccess] Failed to check access for document', {
            tenantId,
            documentId,
            error: (err as Error).message,
          });
          return {
            documentId,
            result: { allowed: false, reason: 'Access check failed' } as AccessCheckResult,
          };
        }
      }),
    );

    for (const { documentId, result } of batchResults) {
      results[documentId] = result;
    }
  }

  return results;
}
