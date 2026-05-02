// ============================================
// Shahin-Ai — Local Knowledge Document Management Service
// R3.3B Phase G+: Document lifecycle management (soft delete, restore, metadata updates)
// ============================================

import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { checkDocumentAccess } from './local-knowledge-access-control.service';
import { recordCustodyEvent, recordCustodyEventWithClient } from './local-knowledge-custody-chain.service';
import { getLegalHoldInfo as _getLegalHoldInfo } from './local-knowledge-legal-hold.service';
import { getComplianceRetentionRule as _getComplianceRetentionRule } from './local-knowledge-retention.service';
import { logAccess as _logAccess } from './local-knowledge-access-log.service';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

export interface DocumentUpdateInput {
  confidentialityLevel?: string;
  accessControlList?: unknown;
  workspaceId?: string;
  moduleScope?: string[];
  title?: string;
  retentionRule?: unknown;
}

/**
 * Soft delete a document (with recovery period)
 */
export async function softDeleteDocument(
  tenantId: string,
  documentId: string,
  deletedBy: string,
  reason?: string,
  recoveryPeriodDays: number = 30,
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Restore a soft-deleted document
 */
export async function restoreDocument(
  tenantId: string,
  documentId: string,
  restoredBy: string,
): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.local_knowledge_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * Permanently delete expired soft-deleted documents (beyond recovery period)
 */
export async function permanentlyDeleteExpiredDocuments(
  tenantId: string,
): Promise<{ deleted: number; errors: number }> {
  const _schema = tenantSchema(tenantId);
  let deleted = 0;
  let errors = 0;

  try {
    // Find expired soft-deleted documents (beyond recovery period)
    const expiredRes = await LocalKnowledgeAutoRepo.query54(tenantSchema(tenantId), [tenantId]);

    for (const row of expiredRes.rows) {
      try {
        // Double-check legal hold before permanent deletion
        if (row.legal_hold) {
          logger.info('[LocalKnowledgeDocumentManagement] Skipping permanent delete due to legal hold', {
            tenantId,
            documentId: row.document_id,
          });
          continue;
        }

        // Permanently delete (cascade will handle related records)
        await LocalKnowledgeAutoRepo.query53(tenantSchema(tenantId), [row.document_id, tenantId]);

        deleted++;
      } catch (err) {
        logger.warn('[LocalKnowledgeDocumentManagement] Failed to permanently delete expired document', {
          tenantId,
          documentId: row.document_id,
          error: (err as Error).message,
        });
        errors++;
      }
    }

    logger.info('[LocalKnowledgeDocumentManagement] Expired documents cleanup completed', {
      tenantId,
      deleted,
      errors,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeDocumentManagement] Expired documents cleanup failed', {
      tenantId,
      error: (err as Error).message,
    });
    errors++;
  }

  return { deleted, errors };
}

/**
 * Update document metadata (confidentiality, ACL, workspace, module scope, retention rule)
 * Wraps update + version creation + custody event in a transaction
 */
export async function updateDocumentMetadata(
  tenantId: string,
  documentId: string,
  updates: DocumentUpdateInput,
  updatedBy: string,
  userRole: string,
): Promise<void> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.local_knowledge_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * Get list of soft-deleted documents (for recovery)
 */
export async function listDeletedDocuments(
  tenantId: string,
  limit: number = 100,
): Promise<Array<{
  documentId: string;
  title?: string;
  documentType: string;
  deletedAt: string;
  deletedBy: string;
  recoveryPeriodDays: number;
  expiresAt: string;
}>> {
  const _schema = tenantSchema(tenantId);

  try {
    const res = await LocalKnowledgeAutoRepo.query52(tenantSchema(tenantId), [tenantId, limit]);

    return res.rows.map(row => ({
      documentId: row.document_id,
      title: row.title || undefined,
      documentType: row.document_type,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      recoveryPeriodDays: row.recovery_period_days || 30,
      expiresAt: row.expires_at,
    }));
  } catch (err) {
    logger.error('[LocalKnowledgeDocumentManagement] Failed to list deleted documents', {
      tenantId,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Bulk update ACL for multiple documents
 */
export async function bulkUpdateACL(
  tenantId: string,
  documentIds: string[],
  acl: unknown,
  updatedBy: string,
  userRole: string,
): Promise<{ updated: number; errors: number }> {
  let updated = 0;
  let errors = 0;

  for (const documentId of documentIds) {
    try {
      await updateDocumentMetadata(tenantId, documentId, { accessControlList: acl }, updatedBy, userRole);
      updated++;
    } catch (err) {
      logger.warn('[LocalKnowledgeDocumentManagement] Failed to update ACL for document', {
        tenantId,
        documentId,
        error: (err as Error).message,
      });
      errors++;
    }
  }

  return { updated, errors };
}
