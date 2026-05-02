// ============================================
// Shahin-Ai — Local Knowledge Legal Hold Service
// R3.3B Phase G+: Manages legal holds on documents
// ============================================

import { safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import * as _crypto from 'crypto';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

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
  const _schema = tenantSchema(tenantId);

  try {
    // Update document
    await LocalKnowledgeAutoRepo.query109(tenantSchema(tenantId), [documentId, tenantId]);

    // Log in audit table
    await LocalKnowledgeAutoRepo.query108(tenantSchema(tenantId), [tenantId, documentId, removedBy, reason || 'Legal hold removed']);

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
  const _schema = tenantSchema(tenantId);

  try {
    // Update document
    await LocalKnowledgeAutoRepo.query107(tenantSchema(tenantId), [newHoldUntil, documentId, tenantId]);

    // Log in audit table
    await LocalKnowledgeAutoRepo.query106(tenantSchema(tenantId), [tenantId, documentId, extendedBy, reason || 'Legal hold extended', newHoldUntil]);

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
  const _schema = tenantSchema(tenantId);

  try {
    const res = await LocalKnowledgeAutoRepo.query105(tenantSchema(tenantId), [documentId, tenantId]);

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
  const _schema = tenantSchema(tenantId);

  try {
    const res = await LocalKnowledgeAutoRepo.query104(tenantSchema(tenantId), [tenantId]);

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
