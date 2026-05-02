/**
 * @deprecated @removal-date 2026-06-30 @owner DAuth @replacement platform/dauth/ access control
 * This module-local ACL/RBAC system must be replaced by DAuth AccessResolver.
 * See AGENTS.md §4 Law 1, Law 2. DAuth owns all access evaluation.
 */
// ============================================
// Shahin — Per-Workflow ACL Service
// Fine-grained access control for individual workflows
// Falls back to RBAC when no ACL entries exist
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export interface WorkflowAclEntry {
  acl_id: string;
  workflow_id: string;
  grantee_type: "user" | "role" | "team";
  grantee_id: string;
  permission: "view" | "edit" | "execute" | "admin";
  granted_by: string | null;
  created_at: string;
  grantee_name?: string;
}

const PERMISSION_HIERARCHY: Record<string, string[]> = {
  admin: ["admin", "edit", "execute", "view"],
  edit: ["edit", "execute", "view"],
  execute: ["execute", "view"],
  view: ["view"],
};

export async function getWorkflowAcl(tenantId: string, workflowId: string): Promise<WorkflowAclEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT a.acl_id, a.workflow_id, a.grantee_type, a.grantee_id, a.permission,
            a.granted_by, a.created_at
     FROM "${schema}".workflow_acl a
     WHERE a.workflow_id = $1
     ORDER BY a.grantee_type, a.created_at`,
    [workflowId]
  );
  return result.rows;
}

export async function grantAccess(tenantId: string, data: {
  workflowId: string;
  granteeType: "user" | "role" | "team";
  granteeId: string;
  permission: "view" | "edit" | "execute" | "admin";
  grantedBy: string;
}): Promise<WorkflowAclEntry> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_acl
      (workflow_id, grantee_type, grantee_id, permission, granted_by)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (workflow_id, grantee_type, grantee_id, permission) DO NOTHING
     RETURNING *`,
    [data.workflowId, data.granteeType, data.granteeId, data.permission, data.grantedBy]
  );
  if (result.rows.length === 0) {
    // Already exists
    const existing = await safeQuery(
      `SELECT * FROM "${schema}".workflow_acl
       WHERE workflow_id = $1 AND grantee_type = $2 AND grantee_id = $3 AND permission = $4`,
      [data.workflowId, data.granteeType, data.granteeId, data.permission]
    );
    return getFirstRow(existing);
  }
  return getFirstRow(result);
}

export async function revokeAccess(tenantId: string, aclId: string): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `DELETE FROM "${schema}".workflow_acl WHERE acl_id = $1 RETURNING acl_id`,
    [aclId]
  );
  return result.rows.length > 0;
}

/**
 * Check if a user has the required permission on a workflow.
 * If no ACL entries exist for the workflow, returns true (fall back to RBAC).
 */
export async function checkAccess(
  tenantId: string,
  workflowId: string,
  userId: string,
  requiredPermission: "view" | "edit" | "execute" | "admin"
): Promise<boolean> {
  const schema = tenantSchema(tenantId);

  // Check if any ACL entries exist for this workflow
  const countResult = await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".workflow_acl WHERE workflow_id = $1`,
    [workflowId]
  );
  if (parseInt(getFirstRow(countResult)?.cnt, 10) === 0) {
    return true; // No ACL = open (RBAC controls)
  }

  // Check direct user grants
  const userGrants = await safeQuery(
    `SELECT permission FROM "${schema}".workflow_acl
     WHERE workflow_id = $1 AND grantee_type = 'user' AND grantee_id = $2`,
    [workflowId, userId]
  );
  for (const row of userGrants.rows) {
    if (PERMISSION_HIERARCHY[row.permission]?.includes(requiredPermission)) {
      return true;
    }
  }

  // Check role-based grants
  const roleGrants = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT a.permission FROM "${schema}".workflow_acl a
     JOIN "${schema}".user_role_assignments ura ON ura.role_id::text = a.grantee_id
     WHERE a.workflow_id = $1 AND a.grantee_type = 'role' AND ura.user_id = $2`,
    [workflowId, userId]
  ), { tenantId: tenantId, operation: 'query workflow_acl' });
  for (const row of roleGrants.rows) {
    if (PERMISSION_HIERARCHY[(row as any).permission]?.includes(requiredPermission)) {
      return true;
    }
  }

  // Check team-based grants
  const teamGrants = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT a.permission FROM "${schema}".workflow_acl a
     JOIN "${schema}".team_members tm ON tm.team_id::text = a.grantee_id
     WHERE a.workflow_id = $1 AND a.grantee_type = 'team' AND tm.user_id = $2`,
    [workflowId, userId]
  ), { tenantId: tenantId, operation: 'query workflow_acl' });
  for (const row of teamGrants.rows) {
    if (PERMISSION_HIERARCHY[(row as any).permission]?.includes(requiredPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter a list of workflow IDs to only those the user can access.
 * Workflows with no ACL entries are always included.
 */
export async function filterAccessibleWorkflows(
  tenantId: string,
  userId: string
): Promise<{ clause: string; params: string[] }> {
  const schema = tenantSchema(tenantId);

  const paramUserId = userId;
  return {
    clause: `(
    NOT EXISTS (SELECT 1 FROM "${schema}".workflow_acl acl WHERE acl.workflow_id = w.workflow_id)
    OR EXISTS (
      SELECT 1 FROM "${schema}".workflow_acl acl
      WHERE acl.workflow_id = w.workflow_id
        AND (
          (acl.grantee_type = 'user' AND acl.grantee_id = $__ACL_USER_ID__)
          OR (acl.grantee_type = 'role' AND acl.grantee_id IN (
            SELECT ura.role_id::text FROM "${schema}".user_role_assignments ura WHERE ura.user_id = $__ACL_USER_ID__
          ))
          OR (acl.grantee_type = 'team' AND acl.grantee_id IN (
            SELECT tm.team_id::text FROM "${schema}".team_members tm WHERE tm.user_id = $__ACL_USER_ID__
          ))
        )
        AND acl.permission IN ('view','edit','execute','admin')
    )
  )`,
    params: [paramUserId],
  };
}
