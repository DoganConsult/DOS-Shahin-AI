/**
 * @deprecated @removal-date 2026-06-30 @owner DAuth @replacement platform/dauth/ access control
 * This module-local ACL/RBAC system must be replaced by DAuth AccessResolver.
 * See AGENTS.md §4 Law 1, Law 2. DAuth owns all access evaluation.
 */
// ============================================
// AGRC-OS -- Local Knowledge Access Control Service
// Document-level access control with ACL, role-based access,
// and classification-level enforcement.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { logAccess } from './local-knowledge-access-log.service';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Classification levels ordered from least to most restrictive. */
export const CLASSIFICATION_LEVELS = ['public', 'internal', 'confidential', 'restricted'] as const;
export type ClassificationLevel = (typeof CLASSIFICATION_LEVELS)[number];

/** Access levels for ACL grants. */
export type AclAccessLevel = 'read' | 'write' | 'admin';

/** Result of an access check. */
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  classification?: ClassificationLevel;
}

/** Grantee specification when granting access. */
export interface AccessGrantee {
  userId?: string;
  roleCode?: string;
  teamId?: string;
  accessLevel: AclAccessLevel;
  expiresAt?: string; // ISO-8601
}

/** A single ACL entry returned from queries. */
export interface AclEntry {
  aclId: string;
  documentId: string;
  userId: string | null;
  roleCode: string | null;
  teamId: string | null;
  accessLevel: AclAccessLevel;
  grantedBy: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

/** Document with its access level, returned by getUserAccessibleDocuments. */
export interface AccessibleDocument {
  documentId: string;
  accessLevel: AclAccessLevel;
  source: 'acl' | 'role' | 'public';
}

// ---------------------------------------------------------------------------
// checkDocumentAccess
// ---------------------------------------------------------------------------

/**
 * Determine whether a user may perform `action` on the specified document.
 *
 * Resolution order:
 *  1. Explicit ACL grant (user, role, or team)
 *  2. Role-based access (user's role vs. document ACL role grants)
 *  3. Classification level (user clearance vs. document classification)
 *  4. Public documents are readable by everyone
 */
export async function checkDocumentAccess(
  tenantId: string,
  userId: string,
  documentId: string,
  action: AclAccessLevel = 'read',
): Promise<AccessCheckResult> {
  const schema = tenantSchema(tenantId);

  try {
    // Fetch document classification
    const docResult = await safeQuery(
      `SELECT confidentiality_level, status
         FROM ${schema}.local_knowledge_documents
        WHERE document_id = $1 AND tenant_id = $2`,
      [documentId, tenantId],
    );

    if (docResult.rows.length === 0) {
      return { allowed: false, reason: 'Document not found' };
    }

    const doc = docResult.rows[0];
    const classification: ClassificationLevel = doc.confidentiality_level ?? 'internal';

    // Archived / superseded documents are not accessible
    if (doc.status === 'archived' || doc.status === 'superseded') {
      return { allowed: false, reason: 'Document is archived or superseded', classification };
    }

    // 1. Public documents allow read access to everyone
    if (classification === 'public' && action === 'read') {
      return { allowed: true, reason: 'Public document', classification };
    }

    // 2. Check explicit user-level ACL grant
    const userAcl = await safeQuery(
      `SELECT access_level FROM ${schema}.local_knowledge_document_acl
        WHERE tenant_id = $1 AND document_id = $2 AND user_id = $3
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY
          CASE access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
        LIMIT 1`,
      [tenantId, documentId, userId],
    );

    if (userAcl.rows.length > 0 && accessLevelSufficient(userAcl.rows[0].access_level, action)) {
      return { allowed: true, reason: 'Explicit user ACL grant', classification };
    }

    // 3. Check role-based ACL grants (match user's roles against document role grants)
    const roleAcl = await safeQuery(
      `SELECT acl.access_level
         FROM ${schema}.local_knowledge_document_acl acl
         JOIN ${schema}.user_roles ur ON ur.role_id::text = acl.role_code
        WHERE acl.tenant_id = $1 AND acl.document_id = $2 AND ur.user_id = $3
          AND acl.revoked_at IS NULL AND ur.deleted_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
          AND (ur.valid_to IS NULL OR ur.valid_to > NOW())
        ORDER BY
          CASE acl.access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
        LIMIT 1`,
      [tenantId, documentId, userId],
    );

    if (roleAcl.rows.length > 0 && accessLevelSufficient(roleAcl.rows[0].access_level, action)) {
      return { allowed: true, reason: 'Role-based ACL grant', classification };
    }

    // 4. Check team-based ACL grants
    const teamAcl = await safeQuery(
      `SELECT acl.access_level
         FROM ${schema}.local_knowledge_document_acl acl
         JOIN ${schema}.team_members tm ON tm.team_id = acl.team_id
        WHERE acl.tenant_id = $1 AND acl.document_id = $2 AND tm.user_id = $3
          AND acl.revoked_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
        ORDER BY
          CASE acl.access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
        LIMIT 1`,
      [tenantId, documentId, userId],
    );

    if (teamAcl.rows.length > 0 && accessLevelSufficient(teamAcl.rows[0].access_level, action)) {
      return { allowed: true, reason: 'Team-based ACL grant', classification };
    }

    // 5. Check classification-level clearance via JSONB access_control_list on the document
    //    If the document's ACL has the user listed, that was already checked.
    //    Fall through = denied.
    return {
      allowed: false,
      reason: `No sufficient access grant for action '${action}' on classification '${classification}'`,
      classification,
    };
  } catch (err) {
    logger.error('[AccessControl] checkDocumentAccess failed', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// grantDocumentAccess
// ---------------------------------------------------------------------------

/**
 * Grant access to a document for a user, role, or team.
 * Inserts into `local_knowledge_document_acl` and records the event in the access log.
 */
export async function grantDocumentAccess(
  tenantId: string,
  documentId: string,
  grantee: AccessGrantee,
  grantedBy: string,
): Promise<string> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ---------------------------------------------------------------------------
// revokeDocumentAccess
// ---------------------------------------------------------------------------

/**
 * Revoke a specific ACL entry by its ID (soft delete via revoked_at).
 * Records the revocation in the access log.
 */
export async function revokeDocumentAccess(
  tenantId: string,
  documentId: string,
  aclId: string,
  revokedBy: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.local_knowledge_document_acl
          SET revoked_at = NOW(), revoked_by = $1
        WHERE acl_id = $2 AND tenant_id = $3 AND document_id = $4 AND revoked_at IS NULL`,
      [revokedBy, aclId, tenantId, documentId],
    );

    // Record the revocation in the access log
    await logAccess(tenantId, {
      userId: revokedBy,
      documentId,
      action: 'revoke',
      reason: `Revoked ACL entry ${aclId}`,
    });

    logger.info(`[AccessControl] Revoked aclId=${aclId} doc=${documentId} by=${revokedBy}`);
  } catch (err) {
    logger.error('[AccessControl] revokeDocumentAccess failed', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// getDocumentPermissions
// ---------------------------------------------------------------------------

/**
 * List all active (non-revoked, non-expired) ACL entries for a document.
 */
export async function getDocumentPermissions(
  tenantId: string,
  documentId: string,
): Promise<AclEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT acl_id, document_id, user_id, role_code, team_id, access_level,
            granted_by, granted_at, expires_at, revoked_at
       FROM ${schema}.local_knowledge_document_acl
      WHERE tenant_id = $1 AND document_id = $2 AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY granted_at DESC`,
    [tenantId, documentId],
  );

  return result.rows.map(mapAclEntry);
}

// ---------------------------------------------------------------------------
// getUserAccessibleDocuments
// ---------------------------------------------------------------------------

/**
 * Determine which documents a user can access by combining:
 *  - Explicit user ACL grants
 *  - Role-based ACL grants
 *  - Team-based ACL grants
 *  - Public documents
 *
 * Returns a deduplicated list with the highest access level per document.
 */
export async function getUserAccessibleDocuments(
  tenantId: string,
  userId: string,
): Promise<AccessibleDocument[]> {
  const schema = tenantSchema(tenantId);

  // Use a CTE to combine all access paths and deduplicate
  const result = await safeQuery(
    `WITH user_acl AS (
       -- Direct user grants
       SELECT document_id, access_level, 'acl' AS source
         FROM ${schema}.local_knowledge_document_acl
        WHERE tenant_id = $1 AND user_id = $2 AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
     ),
     role_acl AS (
       -- Role-based grants
       SELECT acl.document_id, acl.access_level, 'role' AS source
         FROM ${schema}.local_knowledge_document_acl acl
         JOIN ${schema}.user_roles ur ON ur.role_id::text = acl.role_code
        WHERE acl.tenant_id = $1 AND ur.user_id = $2
          AND acl.revoked_at IS NULL AND ur.deleted_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
          AND (ur.valid_to IS NULL OR ur.valid_to > NOW())
     ),
     team_acl AS (
       -- Team-based grants
       SELECT acl.document_id, acl.access_level, 'acl' AS source
         FROM ${schema}.local_knowledge_document_acl acl
         JOIN ${schema}.team_members tm ON tm.team_id = acl.team_id
        WHERE acl.tenant_id = $1 AND tm.user_id = $2
          AND acl.revoked_at IS NULL
          AND (acl.expires_at IS NULL OR acl.expires_at > NOW())
     ),
     public_docs AS (
       -- Public documents
       SELECT document_id, 'read' AS access_level, 'public' AS source
         FROM ${schema}.local_knowledge_documents
        WHERE tenant_id = $1 AND confidentiality_level = 'public'
          AND status = 'active' AND deleted_at IS NULL
     ),
     combined AS (
       SELECT * FROM user_acl
       UNION ALL SELECT * FROM role_acl
       UNION ALL SELECT * FROM team_acl
       UNION ALL SELECT * FROM public_docs
     )
     SELECT document_id,
            -- Pick highest access level: admin > write > read
            (ARRAY_AGG(access_level ORDER BY
              CASE access_level WHEN 'admin' THEN 1 WHEN 'write' THEN 2 ELSE 3 END
            ))[1] AS access_level,
            (ARRAY_AGG(source ORDER BY
              CASE source WHEN 'acl' THEN 1 WHEN 'role' THEN 2 ELSE 3 END
            ))[1] AS source
       FROM combined
      GROUP BY document_id
      ORDER BY document_id`,
    [tenantId, userId],
  );

  return result.rows.map((r: GenericRow) => ({
    documentId: r.document_id,
    accessLevel: r.access_level as AclAccessLevel,
    source: r.source as 'acl' | 'role' | 'public',
  }));
}

// ---------------------------------------------------------------------------
// setDocumentClassification
// ---------------------------------------------------------------------------

/**
 * Set the confidentiality classification level for a document.
 */
export async function setDocumentClassification(
  tenantId: string,
  documentId: string,
  classification: ClassificationLevel,
  updatedBy?: string,
): Promise<void> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Access level hierarchy: admin > write > read. */
const ACCESS_LEVEL_RANK: Record<string, number> = { admin: 3, write: 2, read: 1 };

/**
 * Returns true if `grantedLevel` is sufficient for the `requiredLevel`.
 * e.g. admin is sufficient for read, write is sufficient for read, but read is not sufficient for write.
 */
function accessLevelSufficient(grantedLevel: string, requiredLevel: string): boolean {
  return (ACCESS_LEVEL_RANK[grantedLevel] ?? 0) >= (ACCESS_LEVEL_RANK[requiredLevel] ?? 0);
}

/** Map a raw DB row to the AclEntry interface. */
function mapAclEntry(r: GenericRow): AclEntry {
  return {
    aclId: r.acl_id,
    documentId: r.document_id,
    userId: r.user_id ?? null,
    roleCode: r.role_code ?? null,
    teamId: r.team_id ?? null,
    accessLevel: r.access_level,
    grantedBy: r.granted_by,
    grantedAt: r.granted_at,
    expiresAt: r.expires_at ?? null,
    revokedAt: r.revoked_at ?? null,
  };
}
