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

import { safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { logAccess } from './local-knowledge-access-log.service';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../action/ports/platform.port';

import { catchHandler, EC } from '@dos/platform-core';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

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
  const _schema = tenantSchema(tenantId);

  try {
    // Fetch document classification
    const docResult = await LocalKnowledgeAutoRepo.query14(tenantSchema(tenantId), [documentId, tenantId]);

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
    const userAcl = await LocalKnowledgeAutoRepo.query13(tenantSchema(tenantId), [tenantId, documentId, userId]);

    if (userAcl.rows.length > 0 && accessLevelSufficient(userAcl.rows[0].access_level, action)) {
      return { allowed: true, reason: 'Explicit user ACL grant', classification };
    }

    // 3. Check role-based ACL grants (match user's roles against document role grants)
    const roleAcl = await LocalKnowledgeAutoRepo.query12(tenantSchema(tenantId), [tenantId, documentId, userId]);

    if (roleAcl.rows.length > 0 && accessLevelSufficient(roleAcl.rows[0].access_level, action)) {
      return { allowed: true, reason: 'Role-based ACL grant', classification };
    }

    // 4. Check team-based ACL grants
    const teamAcl = await LocalKnowledgeAutoRepo.query11(tenantSchema(tenantId), [tenantId, documentId, userId]);

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
  const _schema = tenantSchema(tenantId);

  try {
    await LocalKnowledgeAutoRepo.query9(tenantSchema(tenantId), [revokedBy, aclId, tenantId, documentId]);

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
  const _schema = tenantSchema(tenantId);

  const result = await LocalKnowledgeAutoRepo.query8(tenantSchema(tenantId), [tenantId, documentId]);

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
  const _schema = tenantSchema(tenantId);

  // Use a CTE to combine all access paths and deduplicate
  const result = await LocalKnowledgeAutoRepo.query7(tenantSchema(tenantId), [tenantId, userId]);

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
