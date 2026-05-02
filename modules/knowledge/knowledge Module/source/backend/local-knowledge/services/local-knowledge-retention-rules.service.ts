// ============================================
// Shahin-Ai — Local Knowledge Retention Rules Service
// R3.3B Phase G+: Manages compliance-driven retention rules
// ============================================

import { safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { ComplianceRetentionRule } from './local-knowledge-retention.service';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

/**
 * Set compliance-driven retention rule for a document
 */
export async function setDocumentRetentionRule(
  tenantId: string,
  documentId: string,
  rule: ComplianceRetentionRule,
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

/**
 * Get retention rule for a document
 */
export async function getDocumentRetentionRule(
  tenantId: string,
  documentId: string,
): Promise<ComplianceRetentionRule | null> {
  const { getComplianceRetentionRule } = await import('./local-knowledge-retention.service.js');
  return await getComplianceRetentionRule(tenantId, documentId);
}

/**
 * Apply compliance retention rules to documents (respects legal hold)
 */
export async function applyComplianceRetentionRules(tenantId: string): Promise<{
  archived: number;
  deleted: number;
  errors: number;
}> {
  const _schema = tenantSchema(tenantId);
  let archived = 0;
  let deleted = 0;
  let errors = 0;

  try {
    // Find documents with compliance retention rules
    const docsRes = await LocalKnowledgeAutoRepo.query135(tenantSchema(tenantId), [tenantId]);

    for (const row of docsRes.rows) {
      try {
        const rule: ComplianceRetentionRule = row.retention_rule;
        const updatedAt = new Date(row.updated_at);
        const retentionDays = rule.retentionDays || 365;
        const expiryDate = new Date(updatedAt);
        expiryDate.setDate(expiryDate.getDate() + retentionDays);

        // Skip if under legal hold and legal hold is required
        if (row.legal_hold && rule.legalHoldRequired) {
          continue;
        }

        // If expired, archive or delete based on rule
        if (new Date() > expiryDate) {
          if (rule.archiveAfterDays) {
            // Archive first
            await LocalKnowledgeAutoRepo.query134(tenantSchema(tenantId), [row.document_id, tenantId]);
            archived++;
          } else {
            // Direct deletion (if not under legal hold)
            if (!row.legal_hold) {
              await LocalKnowledgeAutoRepo.query133(tenantSchema(tenantId), [row.document_id, tenantId]);
              deleted++;
            }
          }
        }
      } catch (err) {
        logger.warn('[LocalKnowledgeRetentionRules] Failed to apply rule to document', {
          tenantId,
          documentId: row.document_id,
          error: (err as Error).message,
        });
        errors++;
      }
    }

    logger.info('[LocalKnowledgeRetentionRules] Compliance retention rules applied', {
      tenantId,
      archived,
      deleted,
      errors,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeRetentionRules] Failed to apply compliance retention rules', {
      tenantId,
      error: (err as Error).message,
    });
    errors++;
  }

  return { archived, deleted, errors };
}
