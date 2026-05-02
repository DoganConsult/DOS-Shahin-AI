// ============================================
// Shahin-Ai — Local Knowledge Document Versions Service
// R3.3B Phase G+: Document versioning and comparison
// ============================================

import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

export interface DocumentVersion {
  versionId: string;
  documentId: string;
  versionNumber: number;
  canonicalData: Record<string, unknown>;
  searchableText?: string;
  createdAt: string;
}

/**
 * Get all versions of a document
 */
export async function getDocumentVersions(
  tenantId: string,
  documentId: string,
): Promise<DocumentVersion[]> {
  const _schema = tenantSchema(tenantId);

  try {
    const res = await LocalKnowledgeAutoRepo.query58(tenantSchema(tenantId), [tenantId, documentId]);

    return res.rows.map(row => ({
      versionId: row.version_id,
      documentId: row.document_id,
      versionNumber: row.version_number,
      canonicalData: typeof row.canonical_data === 'string' ? JSON.parse(row.canonical_data) : row.canonical_data,
      searchableText: row.searchable_text || undefined,
      createdAt: row.created_at,
    }));
  } catch (err) {
    logger.error('[LocalKnowledgeDocumentVersions] Failed to get document versions', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Get a specific version of a document
 */
export async function getDocumentVersion(
  tenantId: string,
  documentId: string,
  versionNumber: number,
): Promise<DocumentVersion | null> {
  const _schema = tenantSchema(tenantId);

  try {
    const res = await LocalKnowledgeAutoRepo.query57(tenantSchema(tenantId), [tenantId, documentId, versionNumber]);

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      versionId: row.version_id,
      documentId: row.document_id,
      versionNumber: row.version_number,
      canonicalData: typeof row.canonical_data === 'string' ? JSON.parse(row.canonical_data) : row.canonical_data,
      searchableText: row.searchable_text || undefined,
      createdAt: row.created_at,
    };
  } catch (err) {
    logger.error('[LocalKnowledgeDocumentVersions] Failed to get document version', {
      tenantId,
      documentId,
      versionNumber,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Compare two versions of a document
 */
export async function compareDocumentVersions(
  tenantId: string,
  documentId: string,
  versionA: number,
  versionB: number,
): Promise<{
  differences: Array<{
    field: string;
    versionA: unknown;
    versionB: unknown;
  }>;
  versionA: DocumentVersion | null;
  versionB: DocumentVersion | null;
}> {
  const [vA, vB] = await Promise.all([
    getDocumentVersion(tenantId, documentId, versionA),
    getDocumentVersion(tenantId, documentId, versionB),
  ]);

  if (!vA || !vB) {
    return { differences: [], versionA: vA, versionB: vB };
  }

  const differences: Array<{ field: string; versionA: unknown; versionB: unknown }> = [];

  // Compare canonical data
  const keysA = new Set(Object.keys(vA.canonicalData || {}));
  const keysB = new Set(Object.keys(vB.canonicalData || {}));
  const allKeys = new Set([...keysA, ...keysB]);

  for (const key of allKeys) {
    const valA = vA.canonicalData?.[key];
    const valB = vB.canonicalData?.[key];
    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      differences.push({ field: `canonicalData.${key}`, versionA: valA ?? null, versionB: valB ?? null });
    }
  }

  // Compare searchable text
  if (vA.searchableText !== vB.searchableText) {
    differences.push({
      field: 'searchableText',
      versionA: vA.searchableText || null,
      versionB: vB.searchableText || null,
    });
  }

  return { differences, versionA: vA, versionB: vB };
}
