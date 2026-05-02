/**
 * Foundation Lookups — users, teams, departments, and business units
 * for the compliance workspace.
 *
 * Split from compliance-audit-export.service.ts for modularity.
 */

import { safeQuery } from '../../../ports/database.port';
import { ctx } from "../../misc/compliance.utils.js";
import { getFirstRow } from '@dos/db';

// ═══════════════════════════════════════════════════════════════════
// 19. FOUNDATION LOOKUPS (users, teams, departments, BUs)
// ═══════════════════════════════════════════════════════════════════

export async function getFoundationUsers(tenantId: string) {
  const res = await safeQuery(
    `SELECT u.user_id, u.email, u.display_name, u.role, u.department_id, u.status
     FROM public.users u
     WHERE u.tenant_id = $1 AND u.status != 'deactivated'
     ORDER BY u.display_name`, [tenantId]);
  return res.rows;
}

export async function getFoundationUserDetail(tenantId: string, userId: string) {
  const res = await safeQuery(
    `SELECT u.user_id, u.email, u.display_name, u.role, u.department_id, u.status
     FROM public.users u
     WHERE u.tenant_id = $1 AND u.user_id = $2 AND u.status != 'deactivated'`,
    [tenantId, userId]
  );
  return getFirstRow(res) ?? null;
}

export async function getFoundationTeams(tenantId: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `SELECT team_id, name, description, lead_user_id
     FROM "${schema}".teams WHERE deleted_at IS NULL ORDER BY name`);
  return res.rows;
}

export async function getFoundationDepartments(tenantId: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `SELECT department_id, name, head_user_id, parent_department_id
     FROM "${schema}".departments WHERE deleted_at IS NULL ORDER BY name`);
  return res.rows;
}

export async function getFoundationBusinessUnits(tenantId: string) {
  const { schema } = ctx(tenantId);
  const res = await safeQuery(
    `SELECT business_unit_id, name, head_user_id
     FROM "${schema}".business_units WHERE deleted_at IS NULL ORDER BY name`);
  return res.rows;
}
