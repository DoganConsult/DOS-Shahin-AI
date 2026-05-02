// ============================================
// Shahin-Ai — Local Knowledge Access Filter Service
// R3.3B Phase G+: Filters document lists by access control
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
type ConfidentialityLevel = string;

const ROLE_CONFIDENTIALITY_MAP: Record<string, ConfidentialityLevel> = {
  super_admin: 'top_secret',
  admin: 'restricted',
  manager: 'confidential',
  approver: 'confidential',
  user: 'internal',
  auditor: 'restricted',
  viewer: 'public',
  owner: 'restricted',
};

const CONFIDENTIALITY_HIERARCHY: Record<ConfidentialityLevel, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
  top_secret: 4,
};

/**
 * Filter documents by access control (confidentiality + ACL)
 * Returns document IDs that the user can access
 */
export async function filterDocumentsByAccess(
  tenantId: string,
  documentIds: string[],
  userId: string,
  userRole: string,
  userOrgUnits?: string[],
): Promise<string[]> {
  if (documentIds.length === 0) return [];

  const schema = tenantSchema(tenantId);
  const accessibleIds: string[] = [];

  try {
    // Get all documents at once
    const placeholders = documentIds.map((_, i) => `$${i + 1}`).join(',');
    const res = await safeQuery(
      `SELECT document_id, confidentiality_level, access_control_list, legal_hold, deleted_at
       FROM "${schema}".local_knowledge_documents
       WHERE tenant_id = $${documentIds.length + 1} AND document_id IN (${placeholders})`,
      [...documentIds, tenantId],
    );

    const userMaxLevel: ConfidentialityLevel = (ROLE_CONFIDENTIALITY_MAP[userRole] || 'internal') as ConfidentialityLevel;
    const userLevel = CONFIDENTIALITY_HIERARCHY[userMaxLevel];

    for (const row of res.rows) {
      // Skip deleted documents
      if (row.deleted_at) continue;

      // Check confidentiality
      const docConfidentiality = (row.confidentiality_level || 'internal') as ConfidentialityLevel;
      const docLevel = CONFIDENTIALITY_HIERARCHY[docConfidentiality];
      if (docLevel > userLevel) continue;

      // Check ACL
      const acl = row.access_control_list || {};
      if (acl.roles && acl.roles.length > 0) {
        if (!acl.roles.includes(userRole)) continue;
      }
      if (acl.users && acl.users.length > 0) {
        if (!acl.users.includes(userId)) continue;
      }
      if (acl.org_units && acl.org_units.length > 0 && userOrgUnits) {
        const hasOrgUnitAccess = acl.org_units.some((unit: string) => userOrgUnits.includes(unit));
        if (!hasOrgUnitAccess) continue;
      }

      accessibleIds.push(row.document_id);
    }

    return accessibleIds;
  } catch (err) {
    logger.error('[LocalKnowledgeAccessFilter] Failed to filter documents by access', {
      tenantId,
      documentCount: documentIds.length,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Build SQL WHERE clause for access control filtering (for use in queries)
 * Note: This is a simplified filter - full ACL checks should be done in application layer
 */
export function buildAccessControlWhereClause(
  userId: string,
  userRole: string,
  paramIndex: number = 1,
): { clause: string; params: unknown[] } {
  const userMaxLevel: ConfidentialityLevel = (ROLE_CONFIDENTIALITY_MAP[userRole] || 'internal') as ConfidentialityLevel;
  const allowedLevels: ConfidentialityLevel[] = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
  const userLevel = CONFIDENTIALITY_HIERARCHY[userMaxLevel];
  const accessibleLevels = allowedLevels.filter(level => CONFIDENTIALITY_HIERARCHY[level] <= userLevel);

  // Basic confidentiality filter (ACL checks must be done in application layer)
  const placeholders = accessibleLevels.map((_, i) => `$${paramIndex + i}`).join(',');
  return {
    clause: `AND (confidentiality_level IS NULL OR confidentiality_level IN (${placeholders}))`,
    params: accessibleLevels,
  };
}
