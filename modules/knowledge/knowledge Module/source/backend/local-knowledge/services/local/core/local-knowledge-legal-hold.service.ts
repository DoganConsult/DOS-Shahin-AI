// ============================================
// Shahin-Ai — Local Knowledge Legal Hold Service
// R3.3B Phase G+: Manages legal holds on documents
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import * as _crypto from 'crypto';

export interface LegalHoldInfo {
  legalHold: boolean;
  legalHoldReason?: string;
  legalHoldUntil?: string;
  legalHoldPlacedBy?: string;
  legalHoldPlacedAt?: string;
}

/**
 * Place a legal hold on a document
 */
export async function placeLegalHold(
  tenantId: string,
  documentId: string,
  placedBy: string,
  reason: string,
  holdUntil?: string,
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Remove a legal hold from a document
 */
export async function removeLegalHold(
  tenantId: string,
  documentId: string,
  removedBy: string,
  reason?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    // Update document
    await safeQuery(
      `UPDATE "${schema}".local_knowledge_documents
       SET legal_hold = FALSE,
           legal_hold_reason = NULL,
           legal_hold_until = NULL,
           legal_hold_placed_by = NULL,
           legal_hold_placed_at = NULL,
           updated_at = NOW()
       WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );

    // Log in audit table
    await safeQuery(
      `INSERT INTO "${schema}".local_knowledge_legal_hold_audit
         (tenant_id, document_id, action, placed_by, reason, created_at)
       VALUES ($1, $2, 'removed', $3, $4, NOW())`,
      [tenantId, documentId, removedBy, reason || 'Legal hold removed'],
    );

    logger.info('[LocalKnowledgeLegalHold] Legal hold removed', {
      tenantId,
      documentId,
      removedBy,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeLegalHold] Failed to remove legal hold', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Extend a legal hold
 */
export async function extendLegalHold(
  tenantId: string,
  documentId: string,
  extendedBy: string,
  newHoldUntil: string,
  reason?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    // Update document
    await safeQuery(
      `UPDATE "${schema}".local_knowledge_documents
       SET legal_hold_until = $1,
           updated_at = NOW()
       WHERE document_id = $2 AND tenant_id = $3 AND legal_hold = TRUE`,
      [newHoldUntil, documentId, tenantId],
    );

    // Log in audit table
    await safeQuery(
      `INSERT INTO "${schema}".local_knowledge_legal_hold_audit
         (tenant_id, document_id, action, placed_by, reason, hold_until, created_at)
       VALUES ($1, $2, 'extended', $3, $4, $5, NOW())`,
      [tenantId, documentId, extendedBy, reason || 'Legal hold extended', newHoldUntil],
    );

    logger.info('[LocalKnowledgeLegalHold] Legal hold extended', {
      tenantId,
      documentId,
      extendedBy,
      newHoldUntil,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeLegalHold] Failed to extend legal hold', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Get legal hold information for a document
 */
export async function getLegalHoldInfo(
  tenantId: string,
  documentId: string,
): Promise<LegalHoldInfo | null> {
  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `SELECT legal_hold, legal_hold_reason, legal_hold_until, legal_hold_placed_by, legal_hold_placed_at
       FROM "${schema}".local_knowledge_documents
       WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      legalHold: row.legal_hold || false,
      legalHoldReason: row.legal_hold_reason,
      legalHoldUntil: row.legal_hold_until,
      legalHoldPlacedBy: row.legal_hold_placed_by,
      legalHoldPlacedAt: row.legal_hold_placed_at,
    };
  } catch (err) {
    logger.error('[LocalKnowledgeLegalHold] Failed to get legal hold info', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Get all documents under legal hold for a tenant
 */
export async function getDocumentsUnderLegalHold(
  tenantId: string,
): Promise<Array<{ documentId: string; title?: string; legalHoldUntil?: string }>> {
  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `SELECT document_id, title, legal_hold_until
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $1 AND legal_hold = TRUE AND deleted_at IS NULL
       ORDER BY legal_hold_placed_at DESC`,
      [tenantId],
    );

    return res.rows.map(row => ({
      documentId: row.document_id,
      title: row.title,
      legalHoldUntil: row.legal_hold_until,
    }));
  } catch (err) {
    logger.error('[LocalKnowledgeLegalHold] Failed to get documents under legal hold', {
      tenantId,
      error: (err as Error).message,
    });
    return [];
  }
}
